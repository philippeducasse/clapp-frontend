"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { EmailTemplate } from "@/interfaces/entities/Profile";
import {
  createZodFormSchema,
  sanitizeFormData,
  getInitialValues,
  prepareFormDataForSubmission,
} from "@/helpers/formHelper";
import { getEmailTemplateFormFields } from "../../helpers/form/getEmailTemplateFormFields";
import { profileApiService } from "@/api/profileApiService";
import { useRouter, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { Skeleton } from "@/components/ui/skeleton";
import FormHeader from "@/components/common/form/FormHeader";
import BasicForm from "@/components/common/form/BasicForm";
import { Action, EntityName } from "@/interfaces/Enums";
import { selectProfile, updateProfile } from "@/redux/slices/authSlice";

interface EmailTemplateFormProps {
  action: Action;
}

const EmailTemplateForm = ({ action }: EmailTemplateFormProps) => {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const params = useParams();

  const templateId = action === Action.EDIT ? Number(params?.templateId) : undefined;
  const profile = useSelector((state: RootState) => selectProfile(state));
  const template = profile?.emailTemplates?.find((t) => t.id === templateId);
  const formFields = getEmailTemplateFormFields();
  const formSchema = createZodFormSchema(formFields);
  const [isLoading, setIsLoading] = useState(false);
  const formInitializedRef = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(formFields, template),
    mode: "onSubmit",
  });

  useEffect(() => {
    if (template && action === Action.EDIT && !formInitializedRef.current) {
      form.reset(sanitizeFormData(template, formFields));
      formInitializedRef.current = true;
    }
  }, [template, action, form, formFields]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const cleanedData = prepareFormDataForSubmission(values, formFields) as Omit<
        EmailTemplate,
        "id"
      >;
      const existingTemplates = profile.emailTemplates ?? [];

      let updatedTemplates: EmailTemplate[];

      if (action === Action.EDIT && templateId) {
        updatedTemplates = existingTemplates.map((t) =>
          t.id === templateId ? ({ ...cleanedData, id: templateId } as EmailTemplate) : t,
        );
      } else {
        updatedTemplates = [...existingTemplates, { ...cleanedData } as EmailTemplate];
      }

      const updatedProfile = await profileApiService.update({
        ...profile,
        emailTemplates: updatedTemplates,
      });
      dispatch(updateProfile(updatedProfile));
      router.push(`/profile#email-templates`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!template && templateId && action === Action.EDIT) {
    return <Skeleton />;
  }

  const onCancelHref = `/profile#email-templates`;

  return (
    <>
      <FormHeader action={action} entityName={EntityName.EMAIL_TEMPLATE} />
      <BasicForm
        form={form}
        formFields={formFields}
        onSubmit={onSubmit}
        onCancelHref={onCancelHref}
        isLoading={isLoading}
        entity={template}
      />
    </>
  );
};

export default EmailTemplateForm;
