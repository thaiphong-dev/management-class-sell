# Rule: TypeScript Strict

## 1. KHÔNG dùng `any`

```ts
// ❌ SAI
const data: any = await supabase.from('classes').select()
function processData(input: any) {}

// ✅ ĐÚNG
const { data, error } = await supabase.from('classes').select('*')
// data đã có type từ Database generic
function processData(input: Class) {}
function processUnknown(input: unknown) {
  if (isClass(input)) { /* type guard */ }
}
```

## 2. Tất cả props phải có type

```ts
// ❌ SAI
function ClassCard({ data, onClick }) {}

// ✅ ĐÚNG
interface ClassCardProps {
  data: Class
  onClick?: (id: string) => void
}
function ClassCard({ data, onClick }: ClassCardProps) {}
```

## 3. Return type cho functions quan trọng

```ts
// ❌ SAI
async function getClasses() {
  const { data } = await supabase.from('classes').select()
  return data
}

// ✅ ĐÚNG
async function getClasses(): Promise<Class[]> {
  const { data, error } = await supabase.from('classes').select('*')
  if (error) throw error
  return data ?? []
}
```

## 4. Dùng `satisfies` thay vì `as`

```ts
// ❌ SAI
const config = { role: 'admin' } as ProfileInsert

// ✅ ĐÚNG
const config = { role: 'admin' } satisfies Partial<ProfileInsert>
```

## 5. Enums → Union types

```ts
// ❌ SAI (enum gây issues với tree-shaking)
enum UserRole { Admin = 'admin', Coach = 'coach' }

// ✅ ĐÚNG
type UserRole = 'admin' | 'coach' | 'student'
const USER_ROLES = ['admin', 'coach', 'student'] as const
```

## 6. Null safety

```ts
// ❌ SAI
const name = profile.full_name.toUpperCase()

// ✅ ĐÚNG
const name = profile.full_name?.toUpperCase() ?? 'N/A'
```

## 7. tsconfig phải có strict mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```
