import type { CaliberSummary, GuideRow } from "@/lib/types";

const champ =
  "mt-2 w-full border border-gris-trait bg-papier px-4 py-2.5 text-encre outline-none focus:border-laiton";
const etiquette = "block text-[0.7rem] tracking-[0.16em] text-encre/55 uppercase";

export function GuideForm({
  action,
  calibers,
  guide,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  calibers: CaliberSummary[];
  guide?: GuideRow;
  submitLabel: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      {guide && <input type="hidden" name="guideId" value={guide.id} />}

      <div>
        <label htmlFor="caliberId" className={etiquette}>
          Calibre
        </label>
        <select
          id="caliberId"
          name="caliberId"
          required
          defaultValue={guide?.caliberId ?? ""}
          className={champ}
        >
          <option value="" disabled>
            Choisir un calibre…
          </option>
          {calibers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.brand} {c.reference}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="title" className={etiquette}>
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={guide?.title ?? ""}
          placeholder="OMEGA 265 — Guide complet d'entretien"
          className={champ}
        />
      </div>

      <div>
        <label htmlFor="slug" className={etiquette}>
          Slug <span className="normal-case">(laisser vide pour le déduire du titre)</span>
        </label>
        <input id="slug" name="slug" defaultValue={guide?.slug ?? ""} className={champ} />
      </div>

      <div>
        <label htmlFor="shortDescription" className={etiquette}>
          Courte description
        </label>
        <textarea
          id="shortDescription"
          name="shortDescription"
          rows={3}
          defaultValue={guide?.shortDescription ?? ""}
          placeholder="Le guide d'atelier Cronostic consacré au calibre Omega 265."
          className={champ}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className={etiquette}>
            Prix (€)
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            required
            defaultValue={guide ? (guide.priceCents / 100).toFixed(2) : "14.90"}
            className={champ}
          />
        </div>
        <div>
          <label htmlFor="pageCount" className={etiquette}>
            Nombre de pages
          </label>
          <input
            id="pageCount"
            name="pageCount"
            inputMode="numeric"
            defaultValue={guide?.pageCount ?? ""}
            className={champ}
          />
        </div>
      </div>

      <div>
        <label htmlFor="coverImageUrl" className={etiquette}>
          URL de couverture <span className="normal-case">(facultatif)</span>
        </label>
        <input
          id="coverImageUrl"
          name="coverImageUrl"
          defaultValue={guide?.coverImageUrl ?? ""}
          placeholder="https://…"
          className={champ}
        />
        <p className="mt-2 text-legende text-encre/55">
          Laissez vide pour utiliser la couverture composée par le site.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className={etiquette}>Diffusion</legend>
        <label className="flex items-center gap-3 text-legende text-encre/72">
          <input
            type="checkbox"
            name="includedInSubscription"
            defaultChecked={guide?.includedInSubscription ?? true}
            className="accent-[#c39b48]"
          />
          Inclus dans Cronostic Pro
        </label>
        <label className="flex items-center gap-3 text-legende text-encre/72">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={guide?.isActive ?? false}
            className="accent-[#c39b48]"
          />
          Publié
        </label>
        <p className="text-legende text-encre/55">
          La publication n&apos;a d&apos;effet qu&apos;une fois le PDF téléversé.
        </p>
      </fieldset>

      <button
        type="submit"
        className="bouton"
      >
        {submitLabel}
      </button>
    </form>
  );
}
