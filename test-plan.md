# Registry Implementation Plan

1. Update `types.ts` to include Registry types
2. Create `src/lib/registry.ts` to handle reading/writing registry files
3. Update `src/lib/path.ts` with registry path helper
4. Update `src/lib/symlink.ts` to use registry for `listManagedSkillNames`
5. Update `src/lib/reconcile.ts` to write registry during `applyStatus`
