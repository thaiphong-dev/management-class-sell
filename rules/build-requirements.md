# Rule: Build Requirements

## Checklist trước khi tạo Handoff

Chạy theo thứ tự, tất cả phải pass:

```bash
npm run typecheck   # tsc --noEmit → 0 errors
npm run lint        # ESLint → 0 errors, 0 warnings
npm run build       # tsc && vite build → 0 errors
```

## TypeScript Config (bắt buộc)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": false
  }
}
```

## ESLint Config (bắt buộc)

```js
// eslint.config.js — rules quan trọng
rules: {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': 'error',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'no-console': ['warn', { allow: ['error'] }],
}
```

## Vite Build Config

```ts
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false,        // production không cần sourcemap
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        }
      }
    }
  }
})
```

## Bundle size limits

| Chunk | Max size |
|-------|---------|
| vendor | 200kb gzip |
| supabase | 80kb gzip |
| Mỗi page | 50kb gzip |
| charts | 100kb gzip |

## Pre-handoff checklist

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → 0 errors, 0 warnings
- [ ] Không có `any` type trong code mới
- [ ] Không có `console.log` (chỉ `console.error` được phép)
- [ ] Không có dead code / unused imports
- [ ] Tất cả Supabase calls có error handling
- [ ] Mobile responsive đã test (DevTools 375px width)
- [ ] Tất cả form đã validate (Zod schema)
- [ ] Loading + empty states đã có
