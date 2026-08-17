import './style.css'
import { isSupabaseConfigured } from './supabase'
import {
  createTodo,
  deleteCompletedTodos,
  deleteTodo,
  listTodos,
  setTodoCompleted,
} from './todo-service'
import type { Todo, TodoFilter } from './types'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) throw new Error('找不到 #app 根元素')

app.innerHTML = `
  <main class="page-shell">
    <section class="intro" aria-labelledby="page-title">
      <div class="brand"><span class="brand-mark">S</span> Supabase Lab</div>
      <p class="eyebrow">DATABASE · CRUD · WEB APP</p>
      <h1 id="page-title">把想法，<br><span>变成已完成。</span></h1>
      <p class="intro-copy">一个足够简单、也足够完整的 Supabase Todo 示例。每次操作都会直接读写云端 PostgreSQL 数据库。</p>
      <div class="flow" aria-label="应用数据流">
        <span>浏览器</span><b>→</b><span>Supabase API</span><b>→</b><span>PostgreSQL</span>
      </div>
    </section>

    <section class="todo-card" aria-labelledby="todo-heading">
      <header class="card-header">
        <div>
          <p class="date-label" id="today"></p>
          <h2 id="todo-heading">今日清单</h2>
        </div>
        <button class="icon-button" id="refresh-button" type="button" aria-label="刷新列表" title="从数据库刷新">↻</button>
      </header>

      <div class="setup-notice" id="setup-notice" hidden>
        <strong>还差一步配置</strong>
        <span>请按照 README 设置 <code>.env.local</code> 并执行建表 SQL。</span>
      </div>

      <form class="add-form" id="add-form">
        <label class="sr-only" for="todo-input">新任务</label>
        <input id="todo-input" name="title" maxlength="200" autocomplete="off" placeholder="接下来要做什么？" required />
        <button type="submit">添加任务 <span>↗</span></button>
      </form>

      <div class="status-line" id="status" role="status" aria-live="polite"></div>
      <ul class="todo-list" id="todo-list" aria-label="任务列表"></ul>

      <div class="empty-state" id="empty-state" hidden>
        <div class="empty-icon">✓</div>
        <h3>清单空空如也</h3>
        <p>添加第一项任务，看看数据如何写入 Supabase。</p>
      </div>

      <footer class="card-footer">
        <span id="remaining-count">0 项待完成</span>
        <div class="filters" aria-label="筛选任务">
          <button type="button" data-filter="all" class="active">全部</button>
          <button type="button" data-filter="active">待完成</button>
          <button type="button" data-filter="completed">已完成</button>
        </div>
        <button type="button" class="clear-button" id="clear-completed">清除已完成</button>
      </footer>
    </section>
  </main>
  <div class="toast" id="toast" role="alert" hidden></div>
`

const elements = {
  form: document.querySelector<HTMLFormElement>('#add-form')!,
  input: document.querySelector<HTMLInputElement>('#todo-input')!,
  list: document.querySelector<HTMLUListElement>('#todo-list')!,
  empty: document.querySelector<HTMLDivElement>('#empty-state')!,
  status: document.querySelector<HTMLDivElement>('#status')!,
  count: document.querySelector<HTMLSpanElement>('#remaining-count')!,
  clear: document.querySelector<HTMLButtonElement>('#clear-completed')!,
  refresh: document.querySelector<HTMLButtonElement>('#refresh-button')!,
  notice: document.querySelector<HTMLDivElement>('#setup-notice')!,
  toast: document.querySelector<HTMLDivElement>('#toast')!,
  today: document.querySelector<HTMLParagraphElement>('#today')!,
}

let todos: Todo[] = []
let filter: TodoFilter = 'all'
let toastTimer: number | undefined

elements.today.textContent = new Intl.DateTimeFormat('zh-CN', {
  month: 'long', day: 'numeric', weekday: 'long',
}).format(new Date())

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!)
}

function showToast(message: string): void {
  window.clearTimeout(toastTimer)
  elements.toast.textContent = message
  elements.toast.hidden = false
  toastTimer = window.setTimeout(() => { elements.toast.hidden = true }, 4000)
}

function setBusy(isBusy: boolean, message = ''): void {
  elements.form.querySelector<HTMLButtonElement>('button')!.disabled = isBusy
  elements.input.disabled = isBusy
  elements.refresh.disabled = isBusy
  elements.status.textContent = message
}

function visibleTodos(): Todo[] {
  if (filter === 'active') return todos.filter((todo) => !todo.completed)
  if (filter === 'completed') return todos.filter((todo) => todo.completed)
  return todos
}

function render(): void {
  const visible = visibleTodos()
  elements.list.innerHTML = visible.map((todo) => `
    <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
      <label class="check-control">
        <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-label="将 ${escapeHtml(todo.title)} 标记为${todo.completed ? '未完成' : '已完成'}" />
        <span class="custom-check">✓</span>
      </label>
      <span class="todo-title">${escapeHtml(todo.title)}</span>
      <button class="delete-button" type="button" aria-label="删除 ${escapeHtml(todo.title)}">×</button>
    </li>
  `).join('')

  const remaining = todos.filter((todo) => !todo.completed).length
  const completed = todos.length - remaining
  elements.count.textContent = `${remaining} 项待完成`
  elements.clear.disabled = completed === 0
  elements.empty.hidden = visible.length > 0
  elements.list.hidden = visible.length === 0

  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === filter)
  })
}

async function loadTodos(): Promise<void> {
  setBusy(true, '正在从 Supabase 读取数据…')
  try {
    todos = await listTodos()
    render()
    elements.status.textContent = ''
  } catch (error) {
    elements.status.textContent = '读取失败'
    showToast(error instanceof Error ? error.message : '无法读取任务，请检查 Supabase 配置。')
  } finally {
    setBusy(false, elements.status.textContent)
  }
}

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const title = elements.input.value.trim()
  if (!title) return

  setBusy(true, '正在保存…')
  try {
    const todo = await createTodo(title)
    todos.unshift(todo)
    elements.input.value = ''
    render()
    elements.status.textContent = ''
  } catch (error) {
    showToast(error instanceof Error ? error.message : '添加失败，请稍后重试。')
  } finally {
    setBusy(false, '')
    elements.input.focus()
  }
})

elements.list.addEventListener('change', async (event) => {
  const checkbox = (event.target as Element).closest<HTMLInputElement>('input[type="checkbox"]')
  const item = checkbox?.closest<HTMLLIElement>('.todo-item')
  if (!checkbox || !item) return
  const id = item.dataset.id
  if (!id) return
  checkbox.disabled = true
  try {
    await setTodoCompleted(id, checkbox.checked)
    todos = todos.map((todo) => todo.id === id ? { ...todo, completed: checkbox.checked } : todo)
    render()
  } catch (error) {
    checkbox.checked = !checkbox.checked
    checkbox.disabled = false
    showToast(error instanceof Error ? error.message : '更新失败，请稍后重试。')
  }
})

elements.list.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('.delete-button')
  const item = button?.closest<HTMLLIElement>('.todo-item')
  if (!button || !item) return
  const id = item.dataset.id
  if (!id) return
  button.disabled = true
  try {
    await deleteTodo(id)
    todos = todos.filter((todo) => todo.id !== id)
    render()
  } catch (error) {
    button.disabled = false
    showToast(error instanceof Error ? error.message : '删除失败，请稍后重试。')
  }
})

document.querySelector('.filters')!.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-filter]')
  if (!button) return
  filter = button.dataset.filter as TodoFilter
  render()
})

elements.clear.addEventListener('click', async () => {
  elements.clear.disabled = true
  try {
    await deleteCompletedTodos()
    todos = todos.filter((todo) => !todo.completed)
    render()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '清除失败，请稍后重试。')
    render()
  }
})

elements.refresh.addEventListener('click', () => void loadTodos())

if (isSupabaseConfigured) {
  void loadTodos()
} else {
  elements.notice.hidden = false
  elements.form.querySelector<HTMLButtonElement>('button')!.disabled = true
  elements.input.disabled = true
  render()
}
