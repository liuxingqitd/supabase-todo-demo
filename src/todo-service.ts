import { supabase } from './supabase'
import type { Todo } from './types'

function client() {
  if (!supabase) {
    throw new Error('尚未配置 Supabase。请复制 .env.example 为 .env.local 并填写项目凭据。')
  }
  return supabase
}

export async function listTodos(): Promise<Todo[]> {
  const { data, error } = await client()
    .from('todos')
    .select('id, title, completed, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createTodo(title: string): Promise<Todo> {
  const { data, error } = await client()
    .from('todos')
    .insert({ title })
    .select('id, title, completed, created_at')
    .single()

  if (error) throw error
  return data
}

export async function setTodoCompleted(id: string, completed: boolean): Promise<void> {
  const { error } = await client().from('todos').update({ completed }).eq('id', id)
  if (error) throw error
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await client().from('todos').delete().eq('id', id)
  if (error) throw error
}

export async function deleteCompletedTodos(): Promise<void> {
  const { error } = await client().from('todos').delete().eq('completed', true)
  if (error) throw error
}
