"use client";

import { ControlledFormElement } from "@/interfaces/forms/ControlledFormElement";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import BackButton from "../buttons/BackButton";
import SubmitButton from "../buttons/SubmitButton";
import { getControlledInputs } from "@/helpers/formHelper";
import { Action } from "@/interfaces/Enums";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFormPersist } from "@/hooks/useFormPersist";
import { Upload, Loader2, Send } from "lucide-react";

interface BasicFormProps {
  form: UseFormReturn;
  formFields: ControlledFormElement[];
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onCancelHref?: string;
  isLoading: boolean;
  entity?: unknown;
  formTitle?: string;
  formSubtitle?: string;
  additionalActions?: React.ReactNode;
  action?: Action;
  submitButtonLabel?: string;
  disabled?: boolean;
}

const BasicForm = ({
  form,
  formFields,
  onSubmit,
  onCancelHref,
  isLoading,
  formTitle,
  formSubtitle,
  additionalActions,
  action,
  submitButtonLabel,
  disabled = false,
}: BasicFormProps) => {
  const organisationType = form.watch("organisationType") ?? "";
  const showIcon = action === Action.EDIT || action === Action.APPLY || action === Action.UPLOAD;
  const shouldPersist =
    !!formTitle && action !== Action.EDIT && action !== Action.LOGIN && action !== Action.REGISTER;

  const { clearStorage } = useFormPersist(formTitle || "", form, shouldPersist);

  const handleSubmit = async (values: Record<string, unknown>) => {
    await onSubmit(values);
    if (shouldPersist) clearStorage();
  };
  return (
    <Form {...form}>
      <div className="flex">
        {formTitle && (
          <div className="flex flex-col max-w-[200px]  m-8">
            <h3 className="text-xl text-bold text-primary">{formTitle}</h3>
            {formSubtitle && (
              <p className="text-base mt-2">
                {typeof formSubtitle === "string" && formSubtitle.includes("<a ") ? (
                  <span dangerouslySetInnerHTML={{ __html: formSubtitle }} />
                ) : (
                  formSubtitle
                )}
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full caption-bottom text-sm space-y-6 max-w-4xl mx-auto mt-6 border py-6 px-12 rounded-2xl shadow"
        >
          {formFields.map(
            (formField) =>
              !formField.hidden &&
              (!formField.action || action === formField.action) && (
                <FormField
                  control={form.control}
                  name={formField.fieldName as string}
                  key={formField.fieldName}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary">
                        {formField.label}
                        {formField.required &&
                          action !== Action.LOGIN &&
                          action !== Action.REGISTER && (
                            <span
                              className={`-ml-1 ${
                                form.formState.errors[formField.fieldName]
                                  ? "text-red-600"
                                  : "text-primary"
                              }`}
                            >
                              *
                            </span>
                          )}
                      </FormLabel>
                      <FormControl>
                        {getControlledInputs(formField, field, true, organisationType)}
                      </FormControl>
                      <FormDescription>
                        {formField.helpText?.includes("<a ") ? (
                          <span dangerouslySetInnerHTML={{ __html: formField.helpText }} />
                        ) : (
                          formField.helpText
                        )}
                      </FormDescription>
                      <FormMessage className="text-left" />
                    </FormItem>
                  )}
                />
              ),
          )}
          <div className="flex justify-between mt-6 gap-4">
            {action === Action.LOGIN ? (
              <Button variant={"outline"} type="button">
                <Link href="/register">Register</Link>
              </Button>
            ) : action === Action.REGISTER ? (
              <Button variant={"outline"} type="button">
                <Link href="/login">Login</Link>
              </Button>
            ) : onCancelHref ? (
              <BackButton href={onCancelHref} />
            ) : null}
            <div className="flex gap-4 w-full justify-end">
              {additionalActions}
              {action === Action.APPLY ? (
                <Button disabled={disabled || isLoading}>
                  <Send /> Send application
                </Button>
              ) : action === Action.UPLOAD ? (
                <Button disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Upload />}
                  {isLoading ? "Uploading..." : "Upload"}
                </Button>
              ) : (
                <SubmitButton
                  label={submitButtonLabel ?? "Save"}
                  isLoading={isLoading}
                  showIcon={showIcon}
                />
              )}
            </div>
          </div>
        </form>
      </div>
    </Form>
  );
};

export default BasicForm;
