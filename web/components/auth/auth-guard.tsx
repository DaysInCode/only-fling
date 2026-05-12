"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import { getStoredToken } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useSession();
  const { messages } = useLocale();
  const storedToken = getStoredToken();

  useEffect(() => {
    if (loading || user || storedToken) {
      return;
    }

    const returnTo = encodeURIComponent(pathname || "/account/");
    window.location.replace(`/auth/sign-in/?returnTo=${returnTo}`);
  }, [loading, pathname, storedToken, user]);

  if (loading || (!user && storedToken)) {
    return <div className="panel">{messages.authGuard.loading}</div>;
  }

  if (!user) {
    return <div className="panel">{messages.authGuard.redirecting}</div>;
  }

  return <>{children}</>;
}
