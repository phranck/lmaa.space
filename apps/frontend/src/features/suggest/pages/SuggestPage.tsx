import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";
import { useCategories } from "../../categories/hooks/useCategories.ts";
import { api } from "../../../lib/api.ts";

const schema = z.object({
  shopName: z.string().min(2, "Bitte einen Shop-Namen eingeben"),
  shopUrl: z.string().url("Bitte eine gültige URL eingeben (https://...)"),
  categoryId: z.coerce.number().positive("Bitte eine Kategorie wählen"),
  description: z.string().max(500, "Maximal 500 Zeichen").optional(),
  submitterEmail: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-all";

export function SuggestPage() {
  const { data: categories = [] } = useCategories();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post("/submissions", {
        ...data,
        submitterEmail: data.submitterEmail || undefined,
        description: data.description || undefined,
      }),
    onSuccess: () => setSubmitted(true),
  });

  const description = watch("description") ?? "";

  if (submitted) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 mb-3">
            Vielen Dank für deinen Vorschlag!
          </h1>
          <p className="text-stone-500 mb-10 leading-relaxed">
            Wir prüfen ihn und nehmen ihn bei Eignung in die Liste auf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Zur Startseite
            </Link>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="px-6 py-3 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:border-stone-300 transition-colors"
            >
              Weiteren Shop vorschlagen
            </button>
          </div>
          <p className="mt-10 text-sm text-stone-400">
            Dir gefällt dein.shop?{" "}
            <a
              href="https://ko-fi.com/layeredwork?ref=dein.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline"
            >
              Unterstütze das Projekt!
            </a>
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">
            Shop vorschlagen
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            Hilf mit, die Liste zu erweitern. Dein Vorschlag wird geprüft und bei Eignung aufgenommen.
          </p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-stone-700 mb-1.5">
              Shop-Name <span className="text-amber-600">*</span>
            </label>
            <input
              {...register("shopName")}
              id="shopName"
              type="text"
              placeholder="z.B. Buchhandlung Schiller"
              className={inputClass}
            />
            {errors.shopName && (
              <p className="text-red-500 text-xs mt-1.5">{errors.shopName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="shopUrl" className="block text-sm font-medium text-stone-700 mb-1.5">
              Shop-URL <span className="text-amber-600">*</span>
            </label>
            <input
              {...register("shopUrl")}
              id="shopUrl"
              type="url"
              placeholder="https://..."
              className={inputClass}
            />
            {errors.shopUrl && (
              <p className="text-red-500 text-xs mt-1.5">{errors.shopUrl.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-stone-700 mb-1.5">
              Kategorie <span className="text-amber-600">*</span>
            </label>
            <select {...register("categoryId")} id="categoryId" className={inputClass}>
              <option value="">Bitte wählen…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1.5">{errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Beschreibung{" "}
              <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Was macht diesen Shop besonders? Sortiment, Besonderheiten, Zielgruppe…"
              className={`${inputClass} resize-none`}
            />
            <div className="flex justify-between items-start mt-1.5 gap-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                Optional – aber eine gute Beschreibung hilft anderen, den Shop schneller einzuschätzen.
              </p>
              <span className="text-xs text-stone-400 shrink-0">{description.length}/500</span>
            </div>
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Deine E-Mail{" "}
              <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              {...register("submitterEmail")}
              type="email"
              placeholder="fuer@rueckfragen.de"
              className={inputClass}
            />
            <p className="text-xs text-stone-400 mt-1.5">
              Nur für Rückfragen und Benachrichtigung bei Aufnahme.
            </p>
            {errors.submitterEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.submitterEmail.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-red-500 text-sm text-center">
              Fehler beim Absenden. Bitte versuche es erneut.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? "Wird gesendet…" : "Vorschlag absenden"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
