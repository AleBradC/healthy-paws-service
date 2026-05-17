---
name: Fix F-17 confirmPassword Cleanup
overview: Stop leaking confirmPassword past the validation boundary by removing it from domain types and using Zod-parsed output (with confirmPassword stripped) when constructing service payloads. The Zod schemas already validate the match correctly; only the controller and types need cleanup.
todos:
  - id: types-strip
    content: Remove confirmPassword from OwnerPayload and DoctorPayload in types.ts
    status: completed
  - id: controller-use-parsed
    content: Use ownerResult.data / petResult.data / doctorResult.data in registration.controller.ts and destructure confirmPassword out before passing to the service
    status: completed
isProject: false
---

# Fix F-17: confirmPassword is inconsistent and never validated

## The two problems

### 1. Validated Zod output is thrown away

In [`registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts) the `.refine()` rule on the schemas does catch a mismatch correctly, but right after that the controller hands the **raw `req.body`** to the service rather than the parsed-and-sanitized output:

```ts
const ownerResult = ownerSchema.safeParse(owner);
// ...
const payload: RegisterOwnerPayload = { owner, pet }; // raw `owner`, not ownerResult.data
```

So `ownerResult.data` (clean, type-narrowed, no extra fields) is discarded. `confirmPassword` flows into the service, gets passed to the repository, and is only ignored implicitly because the SQL insert happens to not reference it. Any future code that iterates `owner` keys silently treats `confirmPassword` as part of the domain.

### 2. `confirmPassword` is in domain types

[`types.ts`](healthy-paws-service/src/types.ts) puts `confirmPassword` directly on both payload interfaces:

```ts
export interface OwnerPayload {
  name: string; email: string;
  password: string;
  confirmPassword: string;        // UI-only concern
}
export interface DoctorPayload {
  name: string; email: string;
  password?: string;
  confirmPassword?: string;       // UI-only concern, and optional/required is inconsistent
  clinicName: string; clinicAddress: string;
  specializations: DoctorSpecializationPayload[];
}
```

`confirmPassword` exists only so the form can compare two inputs. It is not data the backend stores, retrieves, or reasons about. The inconsistency (required on owner, optional on doctor) is a separate symptom of the same root cause: the field never had a home in the domain.

## The fix

Two files, no schema changes.

### [`types.ts`](healthy-paws-service/src/types.ts)

Remove `confirmPassword` from both payloads:

```ts
export interface OwnerPayload {
  name: string;
  email: string;
  password: string;
}

export interface DoctorPayload {
  name: string;
  email: string;
  password?: string;
  clinicName: string;
  clinicAddress: string;
  specializations: DoctorSpecializationPayload[];
}
```

### [`registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts)

After `safeParse`, use `result.data` and destructure `confirmPassword` away:

```ts
// registerOwner
const ownerResult = ownerSchema.safeParse(owner);
const petResult = petSchema.safeParse(pet);
if (!ownerResult.success || !petResult.success) { /* unchanged */ }

const { confirmPassword: _oc, ...ownerData } = ownerResult.data;
const payload: RegisterOwnerPayload = {
  owner: ownerData,
  pet: petResult.data,
};

// registerDoctor
const doctorResult = doctorSchema.safeParse(doctor);
if (!doctorResult.success) { /* unchanged */ }

const { confirmPassword: _dc, ...doctorData } = doctorResult.data;
const newDoctor = await this.registrationService.registerDoctor({
  doctor: doctorData,
});
```

This makes the boundary explicit: anything past the controller never sees `confirmPassword`. The schemas still enforce the match — the only behavioral change is that the raw request body no longer leaks into the service.

## Why no schema change

`ownerSchema` / `doctorSchema` already define `confirmPassword: z.string()` and `.refine((d) => d.password === d.confirmPassword, ...)`. That part is correct and stays. The fix is in how the controller **uses** the result, not in how the schema is shaped.

## Files changed

- [`healthy-paws-service/src/types.ts`](healthy-paws-service/src/types.ts) — drop `confirmPassword` from `OwnerPayload` and `DoctorPayload`
- [`healthy-paws-service/src/features/registration/registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts) — use `ownerResult.data` / `petResult.data` / `doctorResult.data`; destructure `confirmPassword` out before building service payload
