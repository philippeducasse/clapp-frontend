"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { Application, ApplicationCreate } from "@/interfaces/entities/Application";
import { createZodFormSchema, sanitizeFormData, getInitialValues } from "@/helpers/formHelper";
import { applicationApiService } from "@/api/applicationApiService";
import { useRouter, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { updateApplication, selectApplication } from "@/redux/slices/applicationSlice";
import { AppDispatch, RootState } from "@/redux/store";
import { getManualApplicationFormFields } from "../../helpers/form/getManualApplicationFormFields";
import FormHeader from "@/components/common/form/FormHeader";
import BasicForm from "@/components/common/form/BasicForm";
import { Action } from "@/interfaces/Enums";
import { EntityName } from "@/interfaces/Enums";
import { refreshApplication } from "../../helpers/refreshApplication";
import { selectProfile } from "@/redux/slices/authSlice";

interface ManualApplicationFormProps {
  action: Action;
}

const ManualApplicationForm = ({ action }: ManualApplicationFormProps) => {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const params = useParams();
  const applicationId = Number(params?.id);
  const application = useSelector((state: RootState) => selectApplication(state, applicationId));
  const profile = useSelector((state: RootState) => selectProfile(state));
  const performances = profile?.performances ?? [];
  const formFields = getManualApplicationFormFields(performances);
  const formSchema = createZodFormSchema(formFields);
  const [isLoading, setIsLoading] = useState(false);
  const initialDataLoadedRef = useRef(false);
  useEffect(() => {
    if (action !== Action.CREATE && !application) {
      refreshApplication(applicationId, dispatch);
    }
  }, [action, applicationId, application, dispatch]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(formFields, application as unknown as Record<string, unknown>),
    mode: "onSubmit",
  });

  useEffect(() => {
    if (application && !initialDataLoadedRef.current) {
      const formData = {
        ...application,
        organisation:
          typeof application.organisation === "object"
            ? application.organisation?.id
            : application.organisation,
        performanceIds: application.performances?.map((p) => String(p.id)) ?? [],
      };

      form.reset(sanitizeFormData(formData as unknown as Record<string, unknown>));
      initialDataLoadedRef.current = true;
    }
  }, [application, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (action === Action.EDIT) {
        const updatedApplication = {
          ...application,
          ...values,
          id: applicationId,
          profileId: profile?.id,
        } as Application;
        await applicationApiService.update(updatedApplication);

        const selectedPerformances = performances.filter((p) =>
          (values.performanceIds as string[])?.includes(String(p.id))
        );
        dispatch(updateApplication({ ...updatedApplication, performances: selectedPerformances }));
        router.push(`/applications/${application?.id}`);
      } else {
        if (profile) {
          const application: ApplicationCreate = {
            ...values,
            profileId: profile.id,
            objectType: (values as Record<string, unknown>).organisationType as string,
            objectId: (values as Record<string, unknown>).organisation as number,
          };
          const newApplication = await applicationApiService.create(
            application as unknown as Application
          );
          router.push(`/applications/${newApplication?.id}`);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onCancelHref = applicationId ? `/applications/${application?.id}` : "/applications";

  return (
    <>
      <FormHeader action={action} entityName={EntityName.APPLICATION} />
      <BasicForm
        form={form}
        formFields={formFields}
        onSubmit={onSubmit}
        onCancelHref={onCancelHref}
        isLoading={isLoading}
        entity={application}
        action={action}
      />
    </>
  );
};
export default ManualApplicationForm;
