export interface Todo {
  id: string
  title: string
  completed: boolean
  created_at: string
}

export type TodoFilter = 'all' | 'active' | 'completed'
