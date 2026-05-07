import Image from "next/image";
import PasswordForm from "@/components/page-components/auth/components/PasswordForm";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
const page = () => {
  const fallback = (
    <>
      <Skeleton className="h-6 mt-2 w-full" />
      <Skeleton className="h-6 mt-2 w-full" />
    </>
  );
  return (
    <div className="flex min-h-screen mt-24 justify-center bg-background">
      <div className="">
        <div className="flex justify-center gap-4 text-primary">
          <h1 className="font-clapp text-4xl">Clapp</h1>
          <Image src="/logo.png" width="60" height="60" alt="Clapping hands" />
        </div>
        <div className="w-full max-w-xl p-8">
          <Suspense fallback={fallback}>
            <PasswordForm isReset />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default page;
