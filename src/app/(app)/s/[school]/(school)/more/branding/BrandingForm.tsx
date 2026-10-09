"use client";

import { brandPalette, normaliseHex, schoolInitials } from "@brillianda/core/brand";
import { BRAND_SWATCHES, brandingSchema } from "@brillianda/core/branding";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { SchoolMark } from "@/components/school/SchoolBrand";
import type { ActionResult, SchoolSummary } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";
import { errorsFor } from "@/lib/formCheck";
import { shrinkLogo } from "@/lib/logo";

type Save = (input: unknown) => Promise<ActionResult<SchoolSummary>>;

/** More › Branding: name and colour (with a live preview), and the logo. Owner only. */
export function BrandingForm({
  school,
  isOwner,
  save,
  upload,
  remove,
}: {
  school: SchoolSummary;
  isOwner: boolean;
  save: Save;
  upload: (form: FormData) => Promise<ActionResult<SchoolSummary>>;
  remove: () => Promise<ActionResult<SchoolSummary>>;
}) {
  const router = useRouter();
  const [name, setName] = useState(school.name);
  const [color, setColor] = useState(school.brandColor);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, startSave] = useTransition();
  const picked = normaliseHex(color);
  const preview = picked ?? school.brandColor;
  const p = brandPalette(preview);
  const adjusted = picked !== null && p.primary !== picked;
  const changed = name.trim() !== school.name || picked !== school.brandColor;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const problems = errorsFor(brandingSchema, { name, brandColor: color });
    if (problems) return setErrors(problems);
    startSave(async () => {
      const result = await save({ name, brandColor: color });
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        toast(result.error);
        return;
      }
      toast("Branding saved");
      router.refresh();
    });
  };

  return (
    <>
      {!isOwner && <Alert tone="info">Only the school owner can change the name, colour and logo.</Alert>}

      <Card title="Name and colour" description="Your colour goes on buttons and highlights. Everything else keeps Brillianda’s calm look, so screens stay easy to read.">
        <form className="grid gap-6" noValidate onSubmit={submit}>
          <TextField
            label="School name"
            value={name}
            disabled={!isOwner}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((x) => ({ ...x, name: undefined }));
            }}
            error={errors.name}
            autoComplete="organization"
          />

          <fieldset className="grid gap-3" disabled={!isOwner}>
            <legend className="mb-3 text-sm font-medium">Colour</legend>
            <div className="flex flex-wrap gap-2.5">
              {BRAND_SWATCHES.map((swatch) => (
                <label key={swatch.hex} className="relative cursor-pointer" title={swatch.name}>
                  <input
                    type="radio"
                    name="swatch"
                    value={swatch.hex}
                    checked={picked === swatch.hex}
                    onChange={() => {
                      setColor(swatch.hex);
                      setErrors((x) => ({ ...x, brandColor: undefined }));
                    }}
                    className="peer sr-only"
                  />
                  <span className="sr-only">{swatch.name}</span>
                  <span
                    aria-hidden
                    className="grid h-11 w-11 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-checked:ring-text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                    style={{ background: swatch.hex, color: brandPalette(swatch.hex).primaryText }}
                  >
                    {picked === swatch.hex && <Icon name="check" className="h-4 w-4" />}
                  </span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <TextField
                label="Or type a colour"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setErrors((x) => ({ ...x, brandColor: undefined }));
                }}
                error={errors.brandColor}
                hint="Like #1E6B45, from your crest or uniform."
                spellCheck={false}
                autoCapitalize="characters"
              />
              <label className={cx("mb-[26px] grid h-11 w-11 cursor-pointer place-items-center overflow-hidden rounded-xl shadow-raised", errors.brandColor && "mb-[50px]")}>
                <span className="sr-only">Pick any colour</span>
                <input type="color" value={preview.toLowerCase()} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-16 w-16 cursor-pointer border-0 bg-transparent p-0" />
              </label>
            </div>
          </fieldset>

          <div aria-live="polite" className="grid gap-3">
            <p className="text-sm font-medium">Preview</p>
            <Preview name={name.trim() || school.name} logoUrl={school.logoUrl} color={preview} />
            {adjusted && <p className="text-[13px] text-text-secondary">Buttons use a slightly darker shade of this colour so the writing on them stays readable.</p>}
          </div>

          {isOwner && (
            <div>
              <Button type="submit" loading={saving} disabled={!changed && school.brandColor === picked}>
                Save
              </Button>
            </div>
          )}
        </form>
      </Card>

      <LogoCard school={school} isOwner={isOwner} upload={upload} remove={remove} />
    </>
  );
}

/** The header, a button, a highlighted tab and a link, as they will look. */
function Preview({ name, logoUrl, color }: { name: string; logoUrl: string | null; color: string }) {
  const p = brandPalette(color);
  return (
    <div className="grid gap-4 rounded-2xl bg-bg p-4">
      <div className="flex items-center gap-3">
        <SchoolMark name={name} logoUrl={logoUrl} brandColor={color} className="h-10 w-10 text-sm" />
        <b className="min-w-0 truncate font-semibold">{name}</b>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium" style={{ background: p.primary, color: p.primaryText }}>
          Add student
        </span>
        <span className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium" style={{ background: p.accentSoft, color: p.accent }}>
          Students
        </span>
        <span className="text-sm font-medium underline underline-offset-4" style={{ color: p.accent }}>
          See all
        </span>
      </div>
    </div>
  );
}

function LogoCard({
  school,
  isOwner,
  upload,
  remove,
}: {
  school: SchoolSummary;
  isOwner: boolean;
  upload: (form: FormData) => Promise<ActionResult<SchoolSummary>>;
  remove: () => Promise<ActionResult<SchoolSummary>>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pick = (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    startTransition(async () => {
      const shrunk = await shrinkLogo(file);
      if (!shrunk.ok) return setProblem(shrunk.message);
      const form = new FormData();
      form.set("logo", shrunk.file);
      const result = await upload(form);
      if (!result.ok) return setProblem(result.error);
      toast("Logo saved");
      router.refresh();
    });
  };

  const drop = () =>
    startTransition(async () => {
      const result = await remove();
      toast(result.ok ? "Logo removed" : result.error);
      if (result.ok) router.refresh();
    });

  return (
    <Card title="Logo" description="Shown on your sign-in page and in the header. Without one, your initials sit on your colour.">
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="grid h-28 w-28 place-items-center rounded-2xl bg-bg p-3">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the school's own upload
            <img src={school.logoUrl} alt={`${school.name} logo`} className="max-h-full max-w-full object-contain" />
          ) : (
            <span aria-label={`No logo yet: ${schoolInitials(school.name)} on your colour`} role="img" className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-semibold" style={{ background: brandPalette(school.brandColor).primary, color: brandPalette(school.brandColor).primaryText }}>
              {schoolInitials(school.name)}
            </span>
          )}
        </div>
        <div className="grid gap-3">
          <p className="text-[13px] text-text-secondary">PNG, JPG or WebP. A square logo on a plain or see-through background looks best. We shrink it to fit, so any size is fine.</p>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} data-testid="logo-input" />
              <Button variant="secondary" loading={pending} onClick={() => input.current?.click()}>
                {school.logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              {school.logoUrl && (
                <Button variant="ghost" disabled={pending} onClick={drop}>
                  Remove
                </Button>
              )}
            </div>
          )}
          {problem && <Alert tone="danger">{problem}</Alert>}
        </div>
      </div>
    </Card>
  );
}
