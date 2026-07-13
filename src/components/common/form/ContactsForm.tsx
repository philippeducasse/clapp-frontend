"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import {
  createZodFormSchema,
  sanitizeFormData,
  getInitialValues,
  prepareFormDataForSubmission,
} from "@/helpers/formHelper";
import { useRouter, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { Skeleton } from "@/components/ui/skeleton";
import FormHeader from "@/components/common/form/FormHeader";
import BasicForm from "@/components/common/form/BasicForm";
import { Action } from "@/interfaces/Enums";
import { EntityName } from "@/interfaces/Enums";
import { OrganisationContact } from "@/interfaces/entities/OrganisationContact";
import { ControlledFormElement } from "@/interfaces/forms/ControlledFormElement";

interface ContactsFormProps<T> {
  action: Action;
  entityName: EntityName;
  baseRoute: string; // e.g., "festivals", "venues", "residencies"
  selectEntity: (state: RootState, id: number) => T | undefined;
  updateEntity: (entity: T) => { type: string; payload: T };
  apiService: {
    create: (entity: T) => Promise<T>;
    update: (entity: T) => Promise<T | void>;
  };
  refreshEntity: (id: number, dispatch: AppDispatch) => void;
  getContactFormFields: (isEdit: boolean) => ControlledFormElement[];
}

function ContactsForm<T extends { id?: number; contacts?: OrganisationContact[] }>({
  action,
  entityName,
  baseRoute,
  selectEntity,
  updateEntity,
  apiService,
  refreshEntity,
  getContactFormFields,
}: ContactsFormProps<T>) {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const params = useParams();
  const [entityId, contactIndex] = [Number(params?.id) || -1, Number(params?.index)];
  const entity = useSelector((state: RootState) => selectEntity(state, entityId ?? -1));
  const formFields = getContactFormFields(action === Action.EDIT);
  const formSchema = createZodFormSchema(formFields);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const contactToEdit =
    action === Action.EDIT && entity?.contacts?.[contactIndex]
      ? entity.contacts[contactIndex]
      : undefined;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(
      formFields,
      contactToEdit as unknown as Record<string, unknown>,
    ),
    mode: "onSubmit",
  });

  // Fetch entity data if not available
  useEffect(() => {
    if (!entity && entityId && entityId !== -1 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      refreshEntity(entityId, dispatch);
    }
  }, [entityId, entity, dispatch, refreshEntity]);

  // Reset form when entity loads
  useEffect(() => {
    if (entity && hasLoadedRef.current) {
      form.reset(sanitizeFormData(entity as unknown as Record<string, unknown>));
      hasLoadedRef.current = false;
    }
  }, [entity, form]);

  // Reset form when contact data is loaded (edit mode only)
  useEffect(() => {
    if (action === Action.EDIT && contactToEdit) {
      form.reset(contactToEdit as unknown as Record<string, unknown>);
    }
  }, [contactToEdit, form, action]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const cleanedData = prepareFormDataForSubmission(values, formFields);

    try {
      const isContactEmpty =
        !cleanedData.email && !cleanedData.name && !cleanedData.role && !cleanedData.phone;

      if (action === Action.EDIT) {
        const updatedContacts = [...(entity?.contacts ?? [])];
        updatedContacts[contactIndex] = cleanedData as unknown as OrganisationContact;

        const updatedEntity = {
          ...entity,
          contacts: updatedContacts,
        } as T;
        await apiService.update(updatedEntity);
        dispatch(updateEntity(updatedEntity));
        router.push(`/${baseRoute}/${entity?.id}`);
      } else {
        const existingContacts = entity?.contacts ?? [];

        const updatedContacts = isContactEmpty
          ? existingContacts
          : [...existingContacts, cleanedData];
        const entityWithContacts = {
          ...entity,
          contacts: updatedContacts,
        };

        const newEntity = await apiService.create(entityWithContacts as unknown as T);
        router.push(`/${baseRoute}/${newEntity?.id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!entity && entityId && entityId !== -1) {
    return <Skeleton />;
  }

  const onCancelHref =
    action === Action.CREATE
      ? `/${baseRoute}/create`
      : entityId && entityId !== -1
        ? `/${baseRoute}/${entity?.id}`
        : `/${baseRoute}`;

  return (
    <>
      <FormHeader action={action} entityName={entityName} />
      <BasicForm
        form={form}
        formFields={formFields}
        onSubmit={onSubmit}
        onCancelHref={onCancelHref}
        isLoading={isLoading}
        entity={entity}
        formTitle="Contacts"
        formSubtitle="Here you can provide optional contact information."
      />
    </>
  );
}

export default ContactsForm;
