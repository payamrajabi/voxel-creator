"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

/** Shown when signed out: a small branded landing that opens Clerk's modal. */
export default function SignInScreen() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-8 bg-[#2E2F32] px-6 text-center text-zinc-100">
      <div>
        <div className="text-3xl font-semibold tracking-tight">VoxelOS</div>
        <p className="mx-auto mt-3 max-w-xs text-sm text-zinc-400">
          Sign in to save your characters and pick them back up on any device.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-3">
        <SignInButton mode="modal">
          <button className="rounded-xl bg-white px-6 py-3 text-base font-semibold text-black transition-transform active:scale-95">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-xl bg-white/10 px-6 py-3 text-base font-semibold text-zinc-100 transition-colors active:bg-white/20">
            Create an account
          </button>
        </SignUpButton>
      </div>
    </main>
  );
}
