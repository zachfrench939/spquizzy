-- The Daily Drop. Apply in the Supabase SQL editor or CLI.
-- Do not grant anon or authenticated read access to public.questions.
-- Launch day must match LAUNCH_DATE in js/config.js.

create table if not exists public.drop_config (
  id int primary key default 1 check (id = 1),
  launch_date date not null
);
insert into public.drop_config (id, launch_date) values (1, '2026-11-10')
on conflict (id) do update set launch_date = excluded.launch_date;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  opted_out_of_boards boolean not null default false,
  is_plus boolean not null default false
);

create table if not exists public.banks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_date date not null,
  drop_number int not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'busted', 'forfeited')),
  pending int not null default 10 check (pending >= 0),
  banked int not null default 0 check (banked >= 0),
  trail jsonb not null default '[10]'::jsonb,
  question_index int not null default 0,
  question_served_at timestamptz,
  finished_at timestamptz,
  unique (user_id, run_date)
);

create table if not exists public.stakes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.daily_runs (id) on delete cascade,
  question_index int not null,
  distribution jsonb not null,
  correct_index int not null,
  kept int not null,
  timed_out boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  pack_index int not null,
  position int not null,
  q text not null,
  answers jsonb not null,
  correct int not null check (correct between 0 and 3),
  source text,
  difficulty text,
  unique (pack_index, position)
);

create or replace view public.questions_public as
  select id, pack_index, position, q, answers from public.questions;

alter table public.profiles enable row level security;
alter table public.banks enable row level security;
alter table public.daily_runs enable row level security;
alter table public.stakes enable row level security;
alter table public.questions enable row level security;
alter table public.drop_config enable row level security;

revoke all on public.questions from anon, authenticated;
grant select on public.questions_public to anon, authenticated;
grant select on public.drop_config to anon, authenticated;

create policy profiles_self on public.profiles
  for select using (auth.uid() = id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = id);
create policy banks_self on public.banks
  for select using (auth.uid() = user_id);
create policy runs_self on public.daily_runs
  for select using (auth.uid() = user_id);
create policy stakes_self on public.stakes
  for select using (
    exists (select 1 from public.daily_runs r where r.id = run_id and r.user_id = auth.uid())
  );

create or replace function public.london_today()
returns date
language sql
stable
as $$ select (timezone('Europe/London', now()))::date $$;

create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.banks (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end;
$$;

create or replace function public.serve_question(p_index int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.london_today();
  launch date;
  drop_no int;
  pack int;
  run public.daily_runs%rowtype;
  q public.questions%rowtype;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.ensure_profile();
  select launch_date into launch from public.drop_config where id = 1;
  drop_no := (today - launch) + 1;
  pack := drop_no - 1;
  if drop_no < 1 then
    raise exception 'drop has not launched';
  end if;
  select * into run from public.daily_runs where user_id = uid and run_date = today;
  if not found then
    insert into public.daily_runs (user_id, run_date, drop_number, pending, trail)
    values (uid, today, drop_no, 10, '[10]'::jsonb)
    returning * into run;
  end if;
  if run.status <> 'in_progress' then
    raise exception 'run closed';
  end if;
  if run.question_index <> p_index then
    raise exception 'wrong question';
  end if;
  if run.question_served_at is null then
    update public.daily_runs set question_served_at = now() where id = run.id returning * into run;
  end if;
  select * into q from public.questions where pack_index = pack and position = p_index;
  if not found then
    raise exception 'question missing';
  end if;
  return jsonb_build_object(
    'id', q.id,
    'q', q.q,
    'answers', q.answers,
    'servedAt', run.question_served_at,
    'pending', run.pending,
    'status', run.status,
    'questionIndex', run.question_index,
    'limitMs', 20000,
    'graceMs', 2000
  );
end;
$$;

create or replace function public.lock_in(p_index int, p_dist jsonb, p_timeout boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.london_today();
  launch date;
  run public.daily_runs%rowtype;
  q public.questions%rowtype;
  elapsed double precision;
  dist int[] := array[0,0,0,0];
  i int;
  placed int := 0;
  empty_count int := 0;
  kept int := 0;
  new_pending int;
  new_status text;
  banked int := 0;
  timed_out boolean := false;
  trail jsonb;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  if jsonb_typeof(p_dist) <> 'array' or jsonb_array_length(p_dist) <> 4 then
    raise exception 'need four answers';
  end if;
  for i in 0..3 loop
    dist[i+1] := (p_dist->>i)::int;
    if dist[i+1] < 0 then
      raise exception 'negative';
    end if;
    placed := placed + dist[i+1];
    if dist[i+1] = 0 then
      empty_count := empty_count + 1;
    end if;
  end loop;
  select * into run from public.daily_runs where user_id = uid and run_date = today for update;
  if not found or run.status <> 'in_progress' or run.question_index <> p_index then
    raise exception 'run not ready';
  end if;
  if run.question_served_at is null then
    raise exception 'question was not served';
  end if;
  elapsed := extract(epoch from (now() - run.question_served_at));
  select launch_date into launch from public.drop_config where id = 1;
  select * into q from public.questions
    where pack_index = ((today - launch)) and position = p_index;
  if not found then
    raise exception 'question missing';
  end if;

  if elapsed > 22 then
    timed_out := true;
    kept := 0;
    new_pending := 0;
  elsif p_timeout then
    timed_out := true;
    if placed > run.pending then
      raise exception 'too many coins';
    end if;
    kept := dist[q.correct + 1];
    new_pending := kept;
  else
    if placed <> run.pending or empty_count < 1 then
      raise exception 'place every coin and leave one answer empty';
    end if;
    kept := dist[q.correct + 1];
    new_pending := kept;
  end if;

  insert into public.stakes (run_id, question_index, distribution, correct_index, kept, timed_out)
  values (run.id, p_index, p_dist, q.correct, kept, timed_out);

  trail := run.trail || to_jsonb(new_pending);
  new_status := 'in_progress';
  banked := 0;
  if new_pending = 0 and p_index < 9 then
    new_status := 'busted';
    banked := 0;
  elsif p_index >= 9 then
    new_status := 'completed';
    banked := new_pending;
    if banked > 0 then
      update public.banks set balance = balance + banked, updated_at = now() where user_id = uid;
    end if;
  end if;

  update public.daily_runs set
    pending = new_pending,
    banked = case when new_status = 'in_progress' then 0 else banked end,
    trail = trail,
    question_index = case when new_status = 'in_progress' then p_index + 1 else p_index end,
    question_served_at = case when new_status = 'in_progress' then null else question_served_at end,
    status = new_status,
    finished_at = case when new_status = 'in_progress' then null else now() end
  where id = run.id;

  return jsonb_build_object(
    'correctIndex', q.correct,
    'kept', kept,
    'pending', new_pending,
    'banked', banked,
    'status', new_status,
    'trail', trail,
    'timedOut', timed_out,
    'elapsed', elapsed
  );
end;
$$;

create or replace function public.forfeit_run()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.london_today();
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  update public.daily_runs
    set status = 'forfeited', banked = 0, pending = 0, finished_at = now()
    where user_id = uid and run_date = today and status = 'in_progress';
  return jsonb_build_object('status', 'forfeited', 'banked', 0);
end;
$$;

revoke all on function public.serve_question(int) from public;
revoke all on function public.lock_in(int, jsonb, boolean) from public;
revoke all on function public.forfeit_run() from public;
grant execute on function public.serve_question(int) to authenticated;
grant execute on function public.lock_in(int, jsonb, boolean) to authenticated;
grant execute on function public.forfeit_run() to authenticated;

insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q01', 0, 0, 'What is the capital of Australia?', '["Sydney", "Melbourne", "Canberra", "Perth"]'::jsonb, 2, 'Canberra was chosen as Australia’s capital in 1908 and is the seat of Parliament (Parliamentary Education Office, Australian Government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q02', 0, 1, 'How many strings does a standard violin have?', '["3", "4", "5", "6"]'::jsonb, 1, 'A standard violin is tuned in fifths on four strings: G, D, A and E (ABRSM / orchestral convention).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q03', 0, 2, 'Which of these pasta shapes is typically filled?', '["Spaghetti", "Penne", "Ravioli", "Linguine"]'::jsonb, 2, 'Ravioli are stuffed pasta parcels; spaghetti, penne and linguine are unfilled (Oxford Companion to Food).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q04', 0, 3, 'Which planet is closest to the Sun?', '["Venus", "Mercury", "Earth", "Mars"]'::jsonb, 1, 'Mercury is the innermost planet in the Solar System (NASA Solar System Exploration).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q05', 0, 4, 'Who wrote the novel Pride and Prejudice?', '["Charlotte Brontë", "Jane Austen", "George Eliot", "Emily Brontë"]'::jsonb, 1, 'Jane Austen, published 1813 (British Library).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q06', 0, 5, 'Who painted the Mona Lisa?', '["Michelangelo", "Raphael", "Leonardo da Vinci", "Caravaggio"]'::jsonb, 2, 'Leonardo da Vinci, early 16th century, in the Louvre collection (Musée du Louvre).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q07', 0, 6, 'What is the chemical symbol for gold?', '["Au", "Ag", "Gd", "Go"]'::jsonb, 0, 'Au from the Latin aurum. Ag is silver; Gd is gadolinium (IUPAC periodic table).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q08', 0, 7, 'How many players does one side start with in a game of association football?', '["9", "10", "11", "12"]'::jsonb, 2, 'IFAB Laws of the Game: a match is played by two teams, each with a maximum of 11 players, including the goalkeeper.', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q09', 0, 8, 'In which year did the Great Fire of London begin?', '["1566", "1666", "1766", "1866"]'::jsonb, 1, '2 September 1666, in Pudding Lane (Museum of London / The National Archives).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d01q10', 0, 9, 'In music, how many demisemiquavers make one crotchet?', '["4", "8", "16", "32"]'::jsonb, 1, 'A crotchet is a quarter note and a demisemiquaver is a 32nd note, so eight demisemiquavers equal one crotchet (ABRSM music theory).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q01', 1, 0, 'How many days are in a leap year?', '["364", "365", "366", "367"]'::jsonb, 2, 'A Gregorian leap year has 366 days, with 29 February added (UK government / Royal Museums Greenwich).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q02', 1, 1, 'What is the capital of France?', '["Lyon", "Marseille", "Paris", "Nice"]'::jsonb, 2, 'Paris is the capital and seat of government of France (French government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q03', 1, 2, 'How many pence are in one pound sterling?', '["10", "20", "50", "100"]'::jsonb, 3, 'Sterling is divided into 100 pence (Bank of England / Royal Mint).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q04', 1, 3, 'Which ocean is the largest?', '["Atlantic", "Indian", "Arctic", "Pacific"]'::jsonb, 3, 'The Pacific is the largest ocean by area and volume (NOAA / National Geographic).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q05', 1, 4, 'Who was the first person to travel in space?', '["Neil Armstrong", "Yuri Gagarin", "Alan Shepard", "Valentina Tereshkova"]'::jsonb, 1, 'Yuri Gagarin, Vostok 1, 12 April 1961 (Roscosmos / NASA history).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q06', 1, 5, 'In which country is the city of Marrakesh?', '["Morocco", "Tunisia", "Egypt", "Algeria"]'::jsonb, 0, 'Marrakesh is a major city in Morocco (Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q07', 1, 6, 'What is the smallest prime number?', '["0", "1", "2", "3"]'::jsonb, 2, 'A prime has exactly two distinct positive divisors, 1 and itself. 0 and 1 are not prime; 2 is the smallest (UK national curriculum / any standard number-theory text).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q08', 1, 7, 'Which bone is the longest in the human body?', '["Tibia", "Fibula", "Femur", "Humerus"]'::jsonb, 2, 'The femur (thigh bone) is the longest and strongest bone in the human body (NHS / Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q09', 1, 8, 'Who composed The Four Seasons?', '["J. S. Bach", "Handel", "Vivaldi", "Mozart"]'::jsonb, 2, 'Antonio Vivaldi, Le quattro stagioni, first published in 1725 (Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d02q10', 1, 9, 'What is the capital of Canada?', '["Toronto", "Vancouver", "Ottawa", "Montreal"]'::jsonb, 2, 'Ottawa is the capital of Canada; Toronto is the largest city (Government of Canada).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q01', 2, 0, 'How many sides does a hexagon have?', '["5", "6", "7", "8"]'::jsonb, 1, 'A hexagon is a six-sided polygon (UK national curriculum).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q02', 2, 1, 'What colour do you get if you mix red and white paint?', '["Pink", "Purple", "Orange", "Brown"]'::jsonb, 0, 'Red plus white produces pink, a tint of red (standard colour-mixing).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q03', 2, 2, 'Which of these is a citrus fruit?', '["Mango", "Banana", "Lemon", "Pear"]'::jsonb, 2, 'Lemon (Citrus limon) is a citrus fruit (Royal Horticultural Society).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q04', 2, 3, 'In which city is the Colosseum?', '["Milan", "Rome", "Naples", "Florence"]'::jsonb, 1, 'The Flavian Amphitheatre, known as the Colosseum, stands in Rome (Parco Archeologico del Colosseo).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q05', 2, 4, 'What is the chemical symbol for iron?', '["Ir", "Fe", "In", "I"]'::jsonb, 1, 'Fe from the Latin ferrum. Ir is iridium; In is indium; I is iodine (IUPAC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q06', 2, 5, 'Who wrote the Harry Potter books?', '["Philip Pullman", "J. K. Rowling", "C. S. Lewis", "J. R. R. Tolkien"]'::jsonb, 1, 'J. K. Rowling, beginning with Harry Potter and the Philosopher’s Stone, 1997 (British Library).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q07', 2, 6, 'How many players from one team are on court in a game of netball?', '["5", "6", "7", "8"]'::jsonb, 2, 'A netball team has seven players on court (World Netball / England Netball rules).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q08', 2, 7, 'What is the hardest naturally occurring substance?', '["Iron", "Quartz", "Diamond", "Granite"]'::jsonb, 2, 'Diamond, a form of carbon, sits at the top of the Mohs hardness scale (Encyclopaedia Britannica / USGS).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q09', 2, 8, 'In which year did the Battle of Hastings take place?', '["1066", "1215", "1415", "1588"]'::jsonb, 0, '14 October 1066 (English Heritage / The National Archives).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d03q10', 2, 9, 'What is the SI unit of electric current?', '["Volt", "Watt", "Ampere", "Ohm"]'::jsonb, 2, 'The ampere is the SI base unit of electric current. Volt is potential difference, watt is power, ohm is resistance (BIPM SI Brochure).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q01', 3, 0, 'How many hours are in a day?', '["12", "20", "24", "48"]'::jsonb, 2, 'A mean solar day is 24 hours (Royal Museums Greenwich).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q02', 3, 1, 'What is the capital of Spain?', '["Barcelona", "Madrid", "Seville", "Valencia"]'::jsonb, 1, 'Madrid is the capital of Spain (Spanish government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q03', 3, 2, 'Which of these animals is a mammal?', '["Crocodile", "Penguin", "Dolphin", "Shark"]'::jsonb, 2, 'Dolphins are marine mammals; the others are a reptile, a bird and a fish (Natural History Museum).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q04', 3, 3, 'Who painted the ceiling of the Sistine Chapel?', '["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"]'::jsonb, 1, 'Michelangelo Buonarroti, 1508–1512 (Vatican Museums).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q05', 3, 4, 'What is the main ingredient in guacamole?', '["Tomato", "Avocado", "Pea", "Cucumber"]'::jsonb, 1, 'Guacamole is a Mexican avocado-based sauce (Oxford Companion to Food).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q06', 3, 5, 'Which English king had six wives?', '["Henry VII", "Henry VIII", "Edward VI", "Charles I"]'::jsonb, 1, 'Henry VIII of England (Historic Royal Palaces / Royal Collection Trust).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q07', 3, 6, 'What is the chemical formula of ordinary table salt?', '["NaCl", "KCl", "Na2CO3", "CaCO3"]'::jsonb, 0, 'Sodium chloride, NaCl (Royal Society of Chemistry).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q08', 3, 7, 'How many squares are on a standard chessboard?', '["36", "64", "81", "100"]'::jsonb, 1, 'An 8×8 board has 64 squares (FIDE Laws of Chess).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q09', 3, 8, 'Which gas do plants absorb for photosynthesis?', '["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"]'::jsonb, 2, 'Photosynthesis takes in carbon dioxide and water and releases oxygen (Royal Society of Biology / BBC Bitesize).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d04q10', 3, 9, 'What is the capital of Brazil?', '["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"]'::jsonb, 2, 'Brasília became the capital in 1960, replacing Rio de Janeiro (Government of Brazil / Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q01', 4, 0, 'How many months have 31 days?', '["5", "6", "7", "8"]'::jsonb, 2, 'January, March, May, July, August, October and December — seven months (Gregorian calendar).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q02', 4, 1, 'What is the capital of Italy?', '["Venice", "Rome", "Milan", "Turin"]'::jsonb, 1, 'Rome is the capital of Italy (Italian government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q03', 4, 2, 'In tennis, what is a score of zero called?', '["Zip", "Love", "Nil", "Duck"]'::jsonb, 1, 'A score of zero is called love (ITF Rules of Tennis).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q04', 4, 3, 'Which is the largest planet in the Solar System?', '["Saturn", "Jupiter", "Neptune", "Earth"]'::jsonb, 1, 'Jupiter is the largest planet by diameter and mass (NASA Solar System Exploration).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q05', 4, 4, 'Who wrote Great Expectations?', '["Charles Dickens", "Jane Austen", "Thomas Hardy", "George Eliot"]'::jsonb, 0, 'Charles Dickens, first published in 1860–61 (British Library).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q06', 4, 5, 'Which organ produces insulin?', '["Liver", "Pancreas", "Kidney", "Stomach"]'::jsonb, 1, 'Insulin is made in the beta cells of the pancreas (NHS / Diabetes UK).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q07', 4, 6, 'Mount Kilimanjaro is in which country?', '["Kenya", "Tanzania", "Ethiopia", "Uganda"]'::jsonb, 1, 'Kilimanjaro is in Tanzania (Tanzania National Parks / Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q08', 4, 7, 'What is the square root of 144?', '["10", "11", "12", "14"]'::jsonb, 2, '12 × 12 = 144 (basic arithmetic).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q09', 4, 8, 'In which year did the Titanic sink?', '["1901", "1912", "1918", "1922"]'::jsonb, 1, 'RMS Titanic sank on 15 April 1912 (National Maritime Museum / Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d05q10', 4, 9, 'How many keys does a standard full-size piano have?', '["76", "88", "92", "100"]'::jsonb, 1, 'A standard modern piano has 88 keys: 52 white and 36 black (Piano Manufacturers Association / standard instrument specification).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q01', 5, 0, 'How many legs does a spider have?', '["6", "8", "10", "12"]'::jsonb, 1, 'Spiders are arachnids and have eight legs (Natural History Museum / Royal Society of Biology).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q02', 5, 1, 'What is the capital of Germany?', '["Munich", "Berlin", "Hamburg", "Frankfurt"]'::jsonb, 1, 'Berlin is the capital of Germany (German Federal Government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q03', 5, 2, 'Which sport is played with a shuttlecock?', '["Tennis", "Squash", "Badminton", "Cricket"]'::jsonb, 2, 'Badminton is played with a shuttlecock (BWF).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q04', 5, 3, 'Which metal is liquid at room temperature?', '["Mercury", "Sodium", "Lead", "Zinc"]'::jsonb, 0, 'Mercury is a liquid at standard room temperature (Royal Society of Chemistry).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q05', 5, 4, 'In which country is the city of Prague?', '["Hungary", "Poland", "Czech Republic", "Austria"]'::jsonb, 2, 'Prague is the capital of the Czech Republic (Czech government).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q06', 5, 5, 'What is 9 × 8?', '["64", "72", "81", "96"]'::jsonb, 1, '9 × 8 = 72 (basic arithmetic).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q07', 5, 6, 'Who was the first woman to win a Nobel Prize?', '["Marie Curie", "Florence Nightingale", "Rosalind Franklin", "Dorothy Hodgkin"]'::jsonb, 0, 'Marie Curie, Nobel Prize in Physics, 1903 (Nobel Prize Outreach).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q08', 5, 7, 'What is the boiling point of water at standard pressure, in degrees Celsius?', '["90", "100", "110", "212"]'::jsonb, 1, '100 °C at standard atmospheric pressure (IUPAC / BBC Bitesize). 212 is the Fahrenheit figure.', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q09', 5, 8, 'In Greek myth, who was king of the gods?', '["Apollo", "Zeus", "Hades", "Hermes"]'::jsonb, 1, 'Zeus was king of the Olympian gods (Oxford Classical Dictionary).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d06q10', 5, 9, 'In which year did the Channel Tunnel open to the public?', '["1986", "1990", "1994", "1998"]'::jsonb, 2, 'Passenger services through the Channel Tunnel began on 6 May 1994 (UK Parliament / Eurotunnel historic notes).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q01', 6, 0, 'How many wheels does a standard bicycle have?', '["1", "2", "3", "4"]'::jsonb, 1, 'A standard safety bicycle has two wheels.', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q02', 6, 1, 'What is the opposite of “hot”?', '["Warm", "Cold", "Cool", "Spicy"]'::jsonb, 1, 'In ordinary English, the antonym of hot, when speaking of temperature, is cold.', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q03', 6, 2, 'Which of these is a primary colour in painting?', '["Green", "Orange", "Blue", "Purple"]'::jsonb, 2, 'The traditional painters’ primaries are red, yellow and blue (standard art teaching).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q04', 6, 3, 'In which city is the Eiffel Tower?', '["Berlin", "Paris", "Brussels", "Rome"]'::jsonb, 1, 'The Eiffel Tower stands in Paris (Société d’Exploitation de la Tour Eiffel).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q05', 6, 4, 'Who wrote The Odyssey?', '["Sophocles", "Homer", "Virgil", "Ovid"]'::jsonb, 1, 'The Odyssey is an ancient Greek epic attributed to Homer (British Library / Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q06', 6, 5, 'What is the largest organ of the human body?', '["Liver", "Skin", "Heart", "Brain"]'::jsonb, 1, 'The skin is the largest organ (NHS / Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q07', 6, 6, 'In cricket, how many balls are in an over?', '["4", "6", "8", "10"]'::jsonb, 1, 'A standard over consists of six legal deliveries (Laws of Cricket, MCC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q08', 6, 7, 'Which chemist published the periodic table in 1869?', '["John Dalton", "Dmitri Mendeleev", "Michael Faraday", "Joseph Priestley"]'::jsonb, 1, 'Dmitri Mendeleev proposed his periodic system in 1869 (Royal Society of Chemistry / IUPAC).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q09', 6, 8, 'What is the capital of New Zealand?', '["Auckland", "Wellington", "Christchurch", "Hamilton"]'::jsonb, 1, 'Wellington is the capital; Auckland is the largest city (New Zealand government).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d07q10', 6, 9, 'Which of these instruments is a woodwind?', '["Trumpet", "Violin", "Oboe", "Timpani"]'::jsonb, 2, 'The oboe is a double-reed woodwind. Trumpet is brass, violin is a string instrument, timpani are percussion (ABRSM / orchestral classification).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q01', 7, 0, 'How many strings does a standard guitar have?', '["4", "5", "6", "8"]'::jsonb, 2, 'A standard guitar has six strings (ABRSM). A bass guitar typically has four.', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q02', 7, 1, 'What is the capital of the Republic of Ireland?', '["Belfast", "Cork", "Dublin", "Galway"]'::jsonb, 2, 'Dublin is the capital of the Republic of Ireland. Belfast is the capital of Northern Ireland (Irish government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q03', 7, 2, 'Which of these is a herb?', '["Apple", "Basil", "Rice", "Salt"]'::jsonb, 1, 'Basil (Ocimum basilicum) is a culinary herb (Royal Horticultural Society).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q04', 7, 3, 'Who painted Sunflowers?', '["Monet", "Vincent van Gogh", "Picasso", "Rembrandt"]'::jsonb, 1, 'Vincent van Gogh painted several Sunflowers still lifes in the late 1880s, including works in the National Gallery, London (National Gallery).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q05', 7, 4, 'What is the highest mountain in the UK?', '["Ben Nevis", "Snowdon", "Scafell Pike", "Ben Macdui"]'::jsonb, 0, 'Ben Nevis in the Scottish Highlands, 1,345 metres (Ordnance Survey).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q06', 7, 5, 'How many degrees are in a right angle?', '["45", "60", "90", "180"]'::jsonb, 2, 'A right angle is 90 degrees (UK national curriculum).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q07', 7, 6, 'Which blood type is known as the universal donor?', '["A+", "B+", "AB+", "O−"]'::jsonb, 3, 'O negative red cells can be given to patients of any ABO and Rh type in an emergency (NHS Blood and Transplant).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q08', 7, 7, 'In which sea is the island of Cyprus?', '["Aegean Sea", "Adriatic Sea", "Mediterranean Sea", "Black Sea"]'::jsonb, 2, 'Cyprus is an island in the eastern Mediterranean (Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q09', 7, 8, 'Who wrote the novel 1984?', '["Aldous Huxley", "George Orwell", "William Golding", "Anthony Burgess"]'::jsonb, 1, 'George Orwell, published 1949 (British Library).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d08q10', 7, 9, 'What is the speed of light in a vacuum, to the nearest 100,000 km/s?', '["3,000 km/s", "30,000 km/s", "300,000 km/s", "3 million km/s"]'::jsonb, 2, 'The speed of light in vacuum is exactly 299,792,458 m/s, about 300,000 km/s (BIPM SI Brochure).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q01', 8, 0, 'How many minutes are in an hour?', '["30", "60", "90", "100"]'::jsonb, 1, 'There are 60 minutes in an hour (standard sexagesimal time).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q02', 8, 1, 'How many sides does a square have?', '["3", "4", "5", "6"]'::jsonb, 1, 'A square is a four-sided regular polygon (UK national curriculum).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q03', 8, 2, 'Which of these animals can truly fly?', '["Penguin", "Ostrich", "Bat", "Kiwi"]'::jsonb, 2, 'Bats are flying mammals. Penguins, ostriches and kiwis are flightless birds (Natural History Museum).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q04', 8, 3, 'What is the capital of Sweden?', '["Oslo", "Stockholm", "Copenhagen", "Helsinki"]'::jsonb, 1, 'Stockholm is the capital of Sweden. Oslo, Copenhagen and Helsinki are the capitals of Norway, Denmark and Finland (Swedish government).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q05', 8, 4, 'Who was the Greek goddess of wisdom?', '["Hera", "Athena", "Aphrodite", "Artemis"]'::jsonb, 1, 'Athena was the goddess of wisdom and warfare (Oxford Classical Dictionary).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q06', 8, 5, 'In association football, a hat-trick means how many goals by one player?', '["2", "3", "4", "5"]'::jsonb, 1, 'A hat-trick is three goals in a single game (widely used sporting convention; IFAB does not define the term, but this is the standard meaning).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q07', 8, 6, 'What is the chemical symbol for potassium?', '["P", "Po", "K", "Pt"]'::jsonb, 2, 'K from the Latin kalium. P is phosphorus, Po is polonium, Pt is platinum (IUPAC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q08', 8, 7, 'The Rosetta Stone was the key to reading which script?', '["Linear B", "Cuneiform", "Egyptian hieroglyphs", "Ogham"]'::jsonb, 2, 'The inscriptions on the Rosetta Stone allowed scholars to decipher Egyptian hieroglyphs (British Museum).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q09', 8, 8, 'In which year did Elizabeth II become queen?', '["1945", "1952", "1961", "1977"]'::jsonb, 1, 'She acceded on 6 February 1952, on the death of George VI (Royal Household / The National Archives).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d09q10', 8, 9, 'What is the smallest country in the world by area?', '["Monaco", "Vatican City", "San Marino", "Liechtenstein"]'::jsonb, 1, 'Vatican City is the smallest sovereign state by area, about 0.44 km² (Vatican official figures / Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q01', 9, 0, 'How many days are in a week?', '["5", "6", "7", "8"]'::jsonb, 2, 'A week has seven days in the civil calendar used in the UK.', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q02', 9, 1, 'What is the capital of the United States?', '["New York", "Washington, D.C.", "Los Angeles", "Chicago"]'::jsonb, 1, 'Washington, D.C. is the capital of the United States (U.S. government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q03', 9, 2, 'Which of these is a winter month in the UK?', '["June", "August", "January", "April"]'::jsonb, 2, 'In the UK, meteorological winter is December, January and February (Met Office).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q04', 9, 3, 'Who wrote The Hobbit?', '["C. S. Lewis", "J. R. R. Tolkien", "Terry Pratchett", "Douglas Adams"]'::jsonb, 1, 'J. R. R. Tolkien, first published in 1937 (British Library).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q05', 9, 4, 'Which gas do humans need to breathe?', '["Nitrogen", "Oxygen", "Carbon dioxide", "Helium"]'::jsonb, 1, 'Human respiration requires oxygen (NHS / BBC Bitesize).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q06', 9, 5, 'How many official languages does the United Nations have?', '["4", "5", "6", "8"]'::jsonb, 2, 'Six: Arabic, Chinese, English, French, Russian and Spanish (United Nations).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q07', 9, 6, 'Which British scientist developed the theory of evolution by natural selection?', '["Isaac Newton", "Charles Darwin", "Stephen Hawking", "Michael Faraday"]'::jsonb, 1, 'Charles Darwin, On the Origin of Species, 1859 (Natural History Museum / Cambridge University Library).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q08', 9, 7, 'What is the name of the process plants use to make food from sunlight?', '["Respiration", "Photosynthesis", "Fermentation", "Germination"]'::jsonb, 1, 'Photosynthesis (Royal Society of Biology / BBC Bitesize).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q09', 9, 8, 'In which city were the first modern Olympic Games held, in 1896?', '["Paris", "Athens", "London", "Rome"]'::jsonb, 1, 'Athens, 1896 (International Olympic Committee).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d10q10', 9, 9, 'What is the chemical formula for ozone?', '["O2", "O3", "CO2", "NO2"]'::jsonb, 1, 'Ozone is a molecule of three oxygen atoms, O3 (Royal Society of Chemistry / NOAA).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q01', 10, 0, 'How many sides does a triangle have?', '["2", "3", "4", "5"]'::jsonb, 1, 'A triangle is a three-sided polygon (UK national curriculum).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q02', 10, 1, 'What is the capital of Scotland?', '["Glasgow", "Edinburgh", "Aberdeen", "Dundee"]'::jsonb, 1, 'Edinburgh is the capital of Scotland (Scottish Government / UK government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q03', 10, 2, 'Which of these is a dairy food?', '["Bread", "Cheese", "Rice", "Apple"]'::jsonb, 1, 'Cheese is made from milk (British Cheese Board / Oxford Companion to Food).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q04', 10, 3, 'Who was the first person to walk on the Moon?', '["Buzz Aldrin", "Neil Armstrong", "Michael Collins", "Yuri Gagarin"]'::jsonb, 1, 'Neil Armstrong, Apollo 11, 20 July 1969. Aldrin followed; Collins remained in lunar orbit (NASA).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q05', 10, 4, 'Which instrument typically has 88 keys?', '["Guitar", "Piano", "Harp", "Violin"]'::jsonb, 1, 'A standard piano has 88 keys (standard instrument specification).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q06', 10, 5, 'How many players from one team are on court in indoor volleyball?', '["5", "6", "7", "9"]'::jsonb, 1, 'Six players per team on court (FIVB Official Volleyball Rules).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q07', 10, 6, 'What is the largest moon of Saturn?', '["Europa", "Ganymede", "Titan", "Callisto"]'::jsonb, 2, 'Titan is Saturn’s largest moon and the only moon with a dense atmosphere. Ganymede, Europa and Callisto orbit Jupiter (NASA Solar System Exploration).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q08', 10, 7, 'In which year did the Berlin Wall fall?', '["1985", "1987", "1989", "1991"]'::jsonb, 2, '9 November 1989 (German Federal Agency for Civic Education / Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q09', 10, 8, 'Who composed the opera The Magic Flute?', '["Beethoven", "Mozart", "Verdi", "Wagner"]'::jsonb, 1, 'Wolfgang Amadeus Mozart, Die Zauberflöte, premiered in Vienna in 1791 (Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d11q10', 10, 9, 'In which year did the Black Death first reach England?', '["1348", "1415", "1485", "1665"]'::jsonb, 0, 'The plague arrived in England in 1348. 1665 is the year of the Great Plague of London (The National Archives / Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q01', 11, 0, 'How many letters are in the English alphabet?', '["24", "25", "26", "27"]'::jsonb, 2, 'The modern English alphabet has 26 letters.', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q02', 11, 1, 'What is the capital of Wales?', '["Swansea", "Cardiff", "Newport", "Bangor"]'::jsonb, 1, 'Cardiff is the capital of Wales (Welsh Government / UK government).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q03', 11, 2, 'Which of these is a vegetable?', '["Apple", "Carrot", "Banana", "Strawberry"]'::jsonb, 1, 'A carrot is a root vegetable (Royal Horticultural Society).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q04', 11, 3, 'Who painted The Scream?', '["Van Gogh", "Edvard Munch", "Picasso", "Dalí"]'::jsonb, 1, 'Edvard Munch, first painted in 1893 (National Museum of Norway).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q05', 11, 4, 'What is the closest star to Earth?', '["Polaris", "Sirius", "The Sun", "Proxima Centauri"]'::jsonb, 2, 'The Sun is a star and is by far the closest to Earth. Proxima Centauri is the next nearest (NASA / Royal Astronomical Society).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q06', 11, 5, 'In darts, what is the highest score from a single dart?', '["20", "50", "60", "100"]'::jsonb, 2, 'A treble 20 scores 60. The bullseye scores 50 (World Darts Federation / PDC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q07', 11, 6, 'Which element has the chemical symbol O?', '["Osmium", "Oxygen", "Gold", "Iron"]'::jsonb, 1, 'O is oxygen. Osmium is Os (IUPAC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q08', 11, 7, 'What is the capital of Kenya?', '["Lagos", "Nairobi", "Addis Ababa", "Kampala"]'::jsonb, 1, 'Nairobi is the capital of Kenya. Lagos is in Nigeria, Addis Ababa in Ethiopia, Kampala in Uganda (Kenyan government).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q09', 11, 8, 'Who wrote To Kill a Mockingbird?', '["John Steinbeck", "Harper Lee", "Sylvia Plath", "Toni Morrison"]'::jsonb, 1, 'Harper Lee, published 1960 (Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d12q10', 11, 9, 'How many yards are in a mile?', '["1,000", "1,760", "2,000", "5,280"]'::jsonb, 1, 'There are 1,760 yards in a statute mile. 5,280 is the number of feet in a mile (UK Weights and Measures / National Physical Laboratory).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q01', 12, 0, 'How many seasons are there in a temperate year?', '["2", "3", "4", "5"]'::jsonb, 2, 'Spring, summer, autumn and winter (Met Office).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q02', 12, 1, 'What is the capital of Northern Ireland?', '["Derry", "Belfast", "Armagh", "Lisburn"]'::jsonb, 1, 'Belfast is the capital of Northern Ireland (UK government / Northern Ireland Executive).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q03', 12, 2, 'Which of these is a type of tree?', '["Rose", "Oak", "Tulip", "Fern"]'::jsonb, 1, 'Oak (Quercus) is a tree (Woodland Trust / Royal Horticultural Society).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q04', 12, 3, 'In which museum is the Mona Lisa displayed?', '["The Uffizi", "The Prado", "The Louvre", "The British Museum"]'::jsonb, 2, 'The Mona Lisa is in the Louvre, Paris (Musée du Louvre).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q05', 12, 4, 'What force pulls objects toward the Earth?', '["Magnetism", "Gravity", "Friction", "Inertia"]'::jsonb, 1, 'Gravity (BBC Bitesize / Royal Astronomical Society).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q06', 12, 5, 'Which is the largest of the North American Great Lakes?', '["Lake Superior", "Lake Michigan", "Lake Huron", "Lake Erie"]'::jsonb, 0, 'Lake Superior is the largest by surface area and volume (NOAA / Encyclopaedia Britannica).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q07', 12, 6, 'What is the chemical symbol for carbon?', '["C", "Ca", "Co", "Cr"]'::jsonb, 0, 'C is carbon. Ca is calcium, Co is cobalt, Cr is chromium (IUPAC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q08', 12, 7, 'In computing, what does CPU stand for?', '["Central Processing Unit", "Core Power Unit", "Central Programme Utility", "Control Process Unit"]'::jsonb, 0, 'Central processing unit is the standard expansion (Oxford Dictionary of Computing).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q09', 12, 8, 'In which year was the Battle of Trafalgar fought?', '["1805", "1812", "1815", "1914"]'::jsonb, 0, '21 October 1805 (Royal Museums Greenwich / National Museum of the Royal Navy). 1815 is Waterloo.', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d13q10', 12, 9, 'How many chromosomes are in a typical human body cell?', '["23", "46", "48", "92"]'::jsonb, 1, '46 chromosomes (23 pairs) in a typical diploid human somatic cell. 23 is the haploid number in egg or sperm (NHS / National Human Genome Research Institute).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q01', 13, 0, 'How many continents are commonly taught in UK schools?', '["5", "6", "7", "8"]'::jsonb, 2, 'Seven: Africa, Antarctica, Asia, Europe, North America, Oceania (or Australia) and South America (UK national curriculum / BBC Bitesize).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q02', 13, 1, 'What do honeybees produce?', '["Milk", "Honey", "Silk", "Wool"]'::jsonb, 1, 'Honeybees produce honey (and also beeswax). Silk comes from silkworms (Natural History Museum / RHS).', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q03', 13, 2, 'Which meal is typically eaten in the morning?', '["Dinner", "Breakfast", "Supper", "Tea"]'::jsonb, 1, 'Breakfast is the meal typically eaten in the morning, at the start of the day.', 'easy');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q04', 13, 3, 'What is the capital of Portugal?', '["Porto", "Lisbon", "Madrid", "Coimbra"]'::jsonb, 1, 'Lisbon is the capital of Portugal (Portuguese government).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q05', 13, 4, 'Who discovered penicillin?', '["Alexander Fleming", "Edward Jenner", "Louis Pasteur", "Joseph Lister"]'::jsonb, 0, 'Alexander Fleming, 1928, at St Mary’s Hospital, London (Nobel Prize Outreach / Science Museum).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q06', 13, 5, 'In rugby union, how many points is a try worth?', '["3", "4", "5", "7"]'::jsonb, 2, 'A try is worth five points; a conversion is two more (World Rugby Laws).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q07', 13, 6, 'What is the chemical symbol for silver?', '["Si", "Sv", "Ag", "Sr"]'::jsonb, 2, 'Ag from the Latin argentum. Si is silicon, Sr is strontium (IUPAC).', 'medium');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q08', 13, 7, 'Which is the largest hot desert in the world?', '["Gobi", "Sahara", "Kalahari", "Arabian"]'::jsonb, 1, 'The Sahara is the largest hot desert. Antarctica is larger overall but is a cold desert, so the question specifies hot (Encyclopaedia Britannica / National Geographic).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q09', 13, 8, 'In which year did the First World War begin?', '["1912", "1914", "1916", "1918"]'::jsonb, 1, '28 July 1914 (Imperial War Museums / Encyclopaedia Britannica).', 'hard');
insert into public.questions (id, pack_index, position, q, answers, correct, source, difficulty) values ('d14q10', 13, 9, 'In which year was Magna Carta first agreed?', '["1066", "1215", "1415", "1688"]'::jsonb, 1, 'King John agreed Magna Carta at Runnymede in June 1215 (British Library / The National Archives).', 'hard');
