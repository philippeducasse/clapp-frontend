"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs, Breadcrumb as BreadcrumbType } from "./breadcrumbsHelper";
import { entityRegistry } from "./breadcrumbsConfig";
const Breadcrumbs = () => {
  const pathname = usePathname();

  const entityKey = pathname.split("/").filter(Boolean)[0];
  const id = pathname.split("/").filter(Boolean)[1];
  const entityName = useSelector((state: RootState) =>
    entityRegistry[entityKey]?.selectName?.(state, id),
  );
  const breadcrumbs = buildBreadcrumbs(pathname, entityName);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <span className="text-base">{crumb.label}</span>
              ) : (
                <BreadcrumbLink className="text-base" href={crumb.path}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default Breadcrumbs;
