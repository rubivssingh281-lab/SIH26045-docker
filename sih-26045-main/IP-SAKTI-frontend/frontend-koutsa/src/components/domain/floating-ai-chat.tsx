"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useAssistantChat } from "@/hooks/queries/use-cases";
import { Button } from "@/components/ui/button";
import { GroundedAnswer } from "@/components/domain/grounded-answer";
import { useLanguage } from "@/components/providers/language-provider";
import { toast } from "sonner";
import type { GroundedAnswer as GroundedAnswerType } from "@/types";

type Message = { role: "user"; content: string } | { role: "assistant"; content: string; grounded?: GroundedAnswerType };

export function FloatingAIChat() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const starterContent = t("chat.starter", "Namaste. Ask about Ayurvedic IP, TK or regulatory status. I answer from cited research sources and will say when the evidence is insufficient.");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: starterContent }]);
  const mutation = useAssistantChat();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mutation.isPending]);

  // Update starter message when language changes if only starter message exists
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === "assistant" && !prev[0].grounded) {
        return [{ role: "assistant", content: starterContent }];
      }
      return prev;
    });
  }, [starterContent]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || mutation.isPending) return;
    setMessages(items => [...items, { role: "user", content: message }]);
    setDraft("");
    try {
      const result = await mutation.mutateAsync(message);
      setMessages(items => [...items, { role: "assistant", content: result.answer, grounded: result }]);
    } catch (error) {
      toast.error(t("Sahayak is unavailable right now"), { description: t("Please try your question again in a moment.") });
    }
  }

  return <>
    {open && <div className="fixed inset-x-2 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] sm:inset-auto sm:bottom-[84px] sm:right-6 z-[55] flex h-[min(580px,calc(100dvh-150px))] sm:w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl transition-all">
      <div className="flex items-center justify-between border-b border-line bg-forest px-3.5 py-3 sm:px-4 sm:py-3.5 text-white">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/15">
            <Bot size={17} />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold">{t("chat.title", "Sahayak AI")}</p>
            <p className="text-[10px] sm:text-[11px] text-white/75">{t("chat.subtitle", "Grounded Ayurvedic IP research")}</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 sm:p-2 hover:bg-white/10" aria-label={t("chat.close_chat", "Close AI chat")}>
          <X size={17} />
        </button>
      </div>
      <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto bg-[#FBFCFE] p-3 sm:p-4">
        <div className="rounded-xl border border-[#E8DDBF] bg-[#FFF9EA] p-2.5 sm:p-3 text-[11px] sm:text-xs leading-4 sm:leading-5 text-[#624000]">
          {t("chat.disclaimer", "Research support only. Responses are informational and do not constitute legal advice.")}
        </div>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {message.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-forest px-3 py-2.5 sm:px-3.5 sm:py-3 text-xs sm:text-sm leading-5 sm:leading-6 text-white">{message.content}</div>
            ) : message.grounded ? (
              <div className="max-w-[98%]"><GroundedAnswer result={message.grounded} compact /></div>
            ) : (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2.5 sm:px-3.5 sm:py-3 text-xs sm:text-sm leading-5 sm:leading-6 text-ink/75 shadow-sm">{message.content}</div>
            )}
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-ink/60 shadow-sm">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="border-t border-line bg-white p-2.5 sm:p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-[#F8FAFD] p-2 focus-within:border-emerald">
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
            rows={2}
            placeholder={t("chat.placeholder", "Ask about Ayurvedic IP…")}
            className="min-h-[40px] sm:min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-1 text-xs sm:text-sm outline-none placeholder:text-ink/40"
            aria-label={t("chat.placeholder", "Ask about Ayurvedic IP…")}
          />
          <Button type="submit" size="sm" disabled={!draft.trim() || mutation.isPending} aria-label={t("chat.send", "Send question")} className="h-9 px-3">
            <Send size={14} />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[9px] sm:text-[10px] text-ink/45 line-clamp-1">{t("chat.hint", "Try: “How is an Ayurvedic formulation classified?”")}</p>
      </form>
    </div>}
    <button
      type="button"
      onClick={() => setOpen(value => !value)}
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-4 sm:right-6 z-[45] flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-forest text-white shadow-xl transition-all duration-200 hover:bg-emerald active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40"
      aria-label={open ? t("chat.close_chat", "Close Sahayak AI chat") : t("chat.open_chat", "Open Sahayak AI chat")}
    >
      {open ? <ChevronDown size={19} className="sm:size-[21px]" /> : <MessageCircle size={19} className="sm:size-[21px]" />}
    </button>
  </>;
}
