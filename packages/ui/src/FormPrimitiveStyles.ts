import { cx } from "./classNames.ts";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldLabelClass,
  fieldOptionalClass,
} from "./FieldPrimitiveStyles.ts";

export const formLabelClass = cx(fieldLabelClass, "mb-1");
export const formOptionalClass = fieldOptionalClass;
export const formHelpClass = fieldHelpClass;
export const formErrorClass = cx(fieldErrorClass, "mt-1");
