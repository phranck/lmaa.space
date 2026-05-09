import { SealWarningIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import type { useForm } from "react-hook-form";

import type { FormConfig } from "@lmaa/contracts";
import type { Category } from "@lmaa/shared";

import type { SimpleFields } from "@/components/islands/dynamic-form-utils";
import { FieldRenderer, type CheckShopResult } from "@/components/islands/DynamicFormFields";

type FormMethods = ReturnType<typeof useForm<SimpleFields>>;

interface DynamicFormRowsProps {
  formConfig: FormConfig;
  errors: FormMethods["formState"]["errors"];
  multiSelectErrors: Record<string, string>;
  control: FormMethods["control"];
  register: FormMethods["register"];
  setValue: FormMethods["setValue"];
  categories: Category[];
  categoryIds: number[];
  onCategoryIdsChange: (ids: number[]) => void;
  regionCodes: string[];
  onRegionCodesChange: (codes: string[]) => void;
  getStaticMultiSelected: (fieldId: string) => string[];
  setStaticMultiSelected: (fieldId: string, values: string[]) => void;
  submitting: boolean;
  onCheckShopResult: (result: CheckShopResult) => void;
}

interface MobileSpanStyle extends CSSProperties {
  "--mobile-span": string;
}

export function DynamicFormRows({
  formConfig,
  errors,
  multiSelectErrors,
  control,
  register,
  setValue,
  categories,
  categoryIds,
  onCategoryIdsChange,
  regionCodes,
  onRegionCodesChange,
  getStaticMultiSelected,
  setStaticMultiSelected,
  submitting,
  onCheckShopResult,
}: DynamicFormRowsProps) {
  const hasRequiredFields = formConfig.rows.some((row) => row.fields.some((field) => field.required));
  let legendRendered = false;

  return formConfig.rows.map((row) => {
    const isSubmitRow = row.fields.some(
      (field) => field.type === "button" && field.buttonType === "submit",
    );
    const showLegend = isSubmitRow && hasRequiredFields && !legendRendered;
    if (showLegend) legendRendered = true;

    const linkedFieldIds = new Set(
      row.fields
        .filter((field) => field.type === "button" && field.buttonAction?.sourceFieldId)
        .map((field) => field.buttonAction!.sourceFieldId),
    );
    const linkedFields = row.fields.filter(
      (field) =>
        (field.type === "button" && !!field.buttonAction?.sourceFieldId) ||
        linkedFieldIds.has(field.id),
    );
    const linkedTotal = linkedFields.reduce((sum, field) => sum + (field.span ?? 12), 0);
    const scale = linkedTotal > 0 && linkedTotal < 12 ? 12 / linkedTotal : 1;

    return (
      <div key={row.id}>
        {showLegend && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--ds-text-subtle)] mb-6 px-1">
            <SealWarningIcon
              weight="duotone"
              className="shrink-0 w-3.5 h-3.5 text-[var(--ds-danger-text)]"
            />
            Mit diesem Symbol gekennzeichnete Felder sind Pflichtfelder und müssen ausgefüllt werden.
          </p>
        )}
        <div className="grid grid-cols-12 gap-4">
          {row.fields.map((field) => {
            const span = field.span ?? 12;
            const hasLinkedButton =
              field.type === "button" && !!field.buttonAction?.sourceFieldId;
            const isLinked = hasLinkedButton || linkedFieldIds.has(field.id);
            const mobileSpan = isLinked ? Math.round(span * scale) : 12;
            const style: MobileSpanStyle = {
              gridColumn: `span ${span}`,
              "--mobile-span": `span ${mobileSpan}`,
            };

            return (
              <div
                key={field.id}
                className={
                  isLinked ? "max-sm:![grid-column:var(--mobile-span)]" : "max-sm:!col-span-12"
                }
                style={style}
              >
                <FieldRenderer
                  field={field}
                  errors={errors}
                  multiSelectErrors={multiSelectErrors}
                  control={control}
                  register={register}
                  setValue={setValue}
                  categories={categories}
                  categoryIds={categoryIds}
                  onCategoryIdsChange={onCategoryIdsChange}
                  regionCodes={regionCodes}
                  onRegionCodesChange={onRegionCodesChange}
                  getStaticMultiSelected={getStaticMultiSelected}
                  setStaticMultiSelected={setStaticMultiSelected}
                  formConfig={formConfig}
                  submitting={submitting}
                  onCheckShopResult={onCheckShopResult}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  });
}
