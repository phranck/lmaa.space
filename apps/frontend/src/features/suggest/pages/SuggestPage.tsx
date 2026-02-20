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
  description: z.string().max(200, "Maximal 200 Zeichen").optional(),
  submitterEmail: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

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
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Danke für deinen Vorschlag!</h1>
          <p className="text-gray-500 mb-8">
            Wir prüfen ihn und nehmen ihn bei Eignung in die Liste auf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Zur Startseite
            </Link>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
            >
              Weiteren Shop vorschlagen
            </button>
          </div>
          <p className="mt-8 text-sm text-gray-400">
            Dir gefällt dein.shop?{" "}
            <a href="https://ko-fi.com/phranck" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
              Unterstütze das Projekt!
            </a>
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shop vorschlagen</h1>
        <p className="text-gray-500 mb-8">
          Hilf mit, die Liste zu erweitern! Dein Vorschlag wird von uns geprüft.
        </p>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-5">
          {/* Shop name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Shop-Name <span className="text-[var(--color-accent)]">*</span>
            </label>
            <input
              {...register("shopName")}
              type="text"
              placeholder="z.B. Buchhandlung Schiller"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
            {errors.shopName && (
              <p className="text-red-500 text-xs mt-1">{errors.shopName.message}</p>
            )}
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Shop-URL <span className="text-[var(--color-accent)]">*</span>
            </label>
            <input
              {...register("shopUrl")}
              type="url"
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
            {errors.shopUrl && (
              <p className="text-red-500 text-xs mt-1">{errors.shopUrl.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kategorie <span className="text-[var(--color-accent)]">*</span>
            </label>
            <select
              {...register("categoryId")}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm bg-white"
            >
              <option value="">Bitte wählen...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Beschreibung{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Was macht diesen Shop besonders? Max. 200 Zeichen."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {description.length}/200
            </p>
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Deine E-Mail{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              {...register("submitterEmail")}
              type="email"
              placeholder="fuer@rueckfragen.de"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
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

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-60"
          >
            {mutation.isPending ? "Wird gesendet..." : "Vorschlag absenden"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
