import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#090D16]">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
            I
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ITrix</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Create your company IT account</h1>
        <p className="text-sm text-slate-400 mt-1">Start resolving employee IT tickets faster with AI</p>
      </div>
      <SignUp
        appearance={{
          theme: dark,
          variables: { colorPrimary: "#10b981" },
          elements: { rootBox: "shadow-2xl rounded-xl" },
        }}
      />
    </main>
  );
}
