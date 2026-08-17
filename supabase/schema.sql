-- 在 Supabase Dashboard > SQL Editor 中运行本文件。
-- 这是一个“公开课堂演示”策略：任何拿到 publishable key 的访客都能操作所有 Todo。

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

grant select, insert, update, delete on table public.todos to anon;

drop policy if exists "Public demo can read todos" on public.todos;
drop policy if exists "Public demo can create todos" on public.todos;
drop policy if exists "Public demo can update todos" on public.todos;
drop policy if exists "Public demo can delete todos" on public.todos;

create policy "Public demo can read todos"
on public.todos for select
to anon
using (true);

create policy "Public demo can create todos"
on public.todos for insert
to anon
with check (char_length(trim(title)) between 1 and 200);

create policy "Public demo can update todos"
on public.todos for update
to anon
using (true)
with check (char_length(trim(title)) between 1 and 200);

create policy "Public demo can delete todos"
on public.todos for delete
to anon
using (true);

insert into public.todos (title, completed)
select * from (values
  ('在 Supabase 中创建数据表', true),
  ('连接 Web 应用与数据库', true),
  ('添加第一条 Todo', false)
) as seed(title, completed)
where not exists (select 1 from public.todos);
