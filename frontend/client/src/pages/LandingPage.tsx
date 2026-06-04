import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ShieldAlert, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface LandingPageProps {
  onEnter: (apiKey: string) => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("openrouter_api_key") || "");
  const [useFreeMode, setUseFreeMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() && !useFreeMode) {
      toast.error("Please provide an OpenRouter API key or proceed in sandbox/demo mode.");
      return;
    }

    const finalKey = apiKey.trim() || "SANDBOX_DEMO_KEY";
    if (apiKey.trim()) {
      localStorage.setItem("openrouter_api_key", apiKey.trim());
    }
    onEnter(finalKey);
    toast.success(apiKey.trim() ? "OpenRouter credentials loaded." : "Entering sandbox mode.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Subtle Textures */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,154,42,0.03),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-xl w-full border border-border/40 bg-card/20 backdrop-blur-md p-8 sm:p-12 relative z-10 flex flex-col gap-8">
        {/* Header Branding */}
        <div className="text-center flex flex-col gap-3">
          <span className="font-mono text-xs tracking-[0.25em] text-primary/80 uppercase">
            Diagnostic Mirror
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-wider uppercase font-medium">
            Incoherence Engine
          </h1>
          <div className="h-[1px] w-12 bg-primary/40 mx-auto my-2" />
        </div>

        {/* Conceptual Copy */}
        <div className="font-sans text-sm leading-relaxed text-muted-foreground text-center flex flex-col gap-4">
          <p>
            AI systems are being scaled as if they understand. They don't. They produce output that looks like understanding — fluent, confident, structurally plausible — but with no mechanism for distinguishing what's real from what sounds right.
          </p>
          <p>
            This isn't a technical curiosity. It's a structural risk. The better they get at performing, the harder the gap becomes to see.
          </p>
          <p className="font-mono text-xs text-primary/60">
            What follows is not an argument about this. It is a direct encounter with it.
          </p>
        </div>

        {/* Step-by-Step Guide to Free OpenRouter Access */}
        <div className="border border-border/20 bg-black/10 p-5 flex flex-col gap-4">
          <span className="font-mono text-[10px] tracking-widest uppercase text-primary">
            How to get Free Access:
          </span>
          <ol className="font-mono text-[11px] text-muted-foreground/80 leading-relaxed list-decimal list-inside flex flex-col gap-2 uppercase">
            <li>
              Go to{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-bold"
              >
                OpenRouter.com
              </a>{" "}
              and sign up for a free account.
            </li>
            <li>
              Navigate to{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-bold"
              >
                Keys
              </a>{" "}
              and generate a free API key.
            </li>
            <li>
              Paste your key below. No credit card is required to use any model labeled with <span className="text-primary font-bold">"(Free)"</span>.
            </li>
          </ol>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-1">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase flex items-center gap-2">
              <KeyRound className="w-3 h-3 text-primary/60" />
              OpenRouter API Key
            </label>
            <Input
              type="password"
              placeholder="sk-or-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (useFreeMode) setUseFreeMode(false);
              }}
              className="font-mono text-sm tracking-widest bg-background/50 border-border/40 focus:border-primary/80 focus:ring-1 focus:ring-primary/40"
            />
            <p className="font-mono text-[10px] text-muted-foreground/60 leading-normal">
              Your key is strictly stored client-side in your browser's local storage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sandbox-mode"
              checked={useFreeMode}
              onChange={(e) => {
                setUseFreeMode(e.target.checked);
                if (e.target.checked) setApiKey("");
              }}
              className="w-3 h-3 border border-border/40 rounded-none accent-primary cursor-pointer"
            />
            <label htmlFor="sandbox-mode" className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase cursor-pointer select-none">
              Or run in Demo Mode (Simulated Critique)
            </label>
          </div>

          <Button
            type="submit"
            className="w-full font-serif text-sm tracking-widest uppercase py-6 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary active:scale-[0.98] transition-all"
          >
            Enter the Mirror
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Footer Warning / Disclaimer */}
        <div className="flex gap-3 border-t border-border/10 pt-6 mt-2">
          <ShieldAlert className="w-5 h-5 text-destructive/60 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-[10px] text-muted-foreground/50 leading-relaxed uppercase">
            WARNING: This interface will annotate conversational failure modes in real time. The critique itself is generated by AI and is subject to the recursive failures it identifies.
          </p>
        </div>
      </div>
    </div>
  );
}
