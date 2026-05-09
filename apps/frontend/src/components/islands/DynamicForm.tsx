import { IconContext } from "@phosphor-icons/react";
import { useMemo, useReducer } from "react";
import { useForm } from "react-hook-form";

import type { FormConfig } from "@lmaa/contracts";
import { createApiRequestError } from "@lmaa/shared";
import type { ApiRequestError, Category } from "@lmaa/shared";

import {
  buildDynamicFormPayload,
  getRequiredMultiSelectErrors,
  type SimpleFields,
} from "@/components/islands/dynamic-form-utils";
import { DynamicFormRows } from "@/components/islands/DynamicFormRows";
import {
  SubmitErrorDialog,
  type SubmitErrorState,
} from "@/components/islands/DynamicFormSubmitErrorDialog";
import { SuccessScreen } from "@/components/islands/DynamicFormSuccess";
import { API_BASE } from "@/lib/client-api";
import { expandFormConfigText } from "@/lib/expand-form-config";
import { getSafeConfigHref } from "@/lib/safe-url";

interface Props {
  formConfig: FormConfig;
  categories: Category[];
}

function getSubmissionErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Verbindung.";
  }

  const typedError = error as ApiRequestError;
  const status = typedError.status;

  if (status === 429) {
    return "Zu viele Vorschläge von deiner Verbindung. Bitte versuche es später erneut.";
  }

  if (status === 400) {
    return typedError.responseMessage || "Bitte prüfe deine Eingaben und versuche es erneut.";
  }

  if (status && status >= 500) {
    return "Serverfehler beim Absenden. Bitte versuche es später erneut.";
  }

  if (typedError.responseMessage) return typedError.responseMessage;
  if (status) return `Absenden fehlgeschlagen (HTTP ${status}). Bitte später erneut versuchen.`;

  return "Fehler beim Absenden. Bitte versuche es erneut.";
}

interface FormState {
  categoryIds: number[];
  regionCodes: string[];
  staticMultiSelects: Record<string, string[]>;
  submitting: boolean;
  submitError: SubmitErrorState | null;
  submitted: boolean;
  multiSelectErrors: Record<string, string>;
}

const initialFormState: FormState = {
  categoryIds: [],
  regionCodes: [],
  staticMultiSelects: {},
  submitting: false,
  submitError: null,
  submitted: false,
  multiSelectErrors: {},
};

function formReducer(state: FormState, patch: Partial<FormState>): FormState {
  return { ...state, ...patch };
}

export default function DynamicForm({ formConfig: rawFormConfig, categories }: Props) {
  const formConfig = useMemo(() => expandFormConfigText(rawFormConfig), [rawFormConfig]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SimpleFields>({ mode: "onSubmit" });

  const [state, dispatch] = useReducer(formReducer, initialFormState);

  function getStaticMultiSelected(fieldId: string): string[] {
    return state.staticMultiSelects[fieldId] ?? [];
  }

  function setStaticMultiSelected(fieldId: string, values: string[]) {
    dispatch({ staticMultiSelects: { ...state.staticMultiSelects, [fieldId]: values } });
  }

  function validateMultiSelects(): boolean {
    const newErrors = getRequiredMultiSelectErrors(formConfig, state);
    dispatch({ multiSelectErrors: newErrors });
    return Object.keys(newErrors).length === 0;
  }

  async function onSubmit(data: SimpleFields) {
    if (!validateMultiSelects()) return;

    dispatch({ submitError: null, submitting: true });

    try {
      const payload = buildDynamicFormPayload(formConfig, data, state);

      const slug = formConfig.slug ?? formConfig.name;
      const res = await fetch(`${API_BASE}/form/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          const error =
            body && typeof body === "object" && "error" in body
              ? (body as Record<string, unknown>).error
              : null;
          const errorObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
          const rawStatus = errorObj?.status;
          const status =
            rawStatus === "published" || rawStatus === "rejected" || rawStatus === "pending"
              ? rawStatus
              : undefined;
          dispatch({
            submitError: {
              message:
                typeof errorObj?.message === "string"
                  ? errorObj.message
                  : "Dieser Shop ist bereits bekannt.",
              status,
              shopName: typeof errorObj?.shopName === "string" ? errorObj.shopName : undefined,
              shopUrl: typeof errorObj?.shopUrl === "string" ? errorObj.shopUrl : undefined,
              rejectionUrl:
                typeof errorObj?.rejectionUrl === "string" ? errorObj.rejectionUrl : undefined,
            },
          });
          return;
        }
        throw await createApiRequestError(res, "Submit failed");
      }

      const safeRedirect = getSafeConfigHref(formConfig.submissionConfig?.successRedirectUrl);
      if (safeRedirect) {
        window.location.href = safeRedirect;
      } else {
        dispatch({ submitted: true });
      }
    } catch (error) {
      dispatch({ submitError: { message: getSubmissionErrorMessage(error) } });
    } finally {
      dispatch({ submitting: false });
    }
  }

  function handleReset() {
    reset();
    dispatch(initialFormState);
  }

  if (state.submitted) {
    return (
      <SuccessScreen
        onReset={handleReset}
        headline={formConfig.submissionConfig?.successHeadline}
        message={formConfig.submissionConfig?.successMessage}
      />
    );
  }

  return (
    <IconContext.Provider
      value={{
        weight: "duotone",
        style: {
          transform: "scale(1.14)",
          transformBox: "fill-box",
          transformOrigin: "center",
        },
      }}
    >
      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="space-y-6"
      >
        <DynamicFormRows
          formConfig={formConfig}
          errors={errors}
          multiSelectErrors={state.multiSelectErrors}
          control={control}
          register={register}
          setValue={setValue}
          categories={categories}
          categoryIds={state.categoryIds}
          onCategoryIdsChange={(ids) => dispatch({ categoryIds: ids })}
          regionCodes={state.regionCodes}
          onRegionCodesChange={(codes) => dispatch({ regionCodes: codes })}
          getStaticMultiSelected={getStaticMultiSelected}
          setStaticMultiSelected={setStaticMultiSelected}
          submitting={state.submitting}
          onCheckShopResult={(result) =>
            dispatch({
              submitError: {
                message: "",
                status: result.status,
                shopName: result.shopName,
                shopUrl: result.shopUrl,
                rejectionUrl: result.rejectionUrl,
              },
            })
          }
        />

        <SubmitErrorDialog
          submitError={state.submitError}
          onClose={() => dispatch({ submitError: null })}
        />
      </form>
    </IconContext.Provider>
  );
}
