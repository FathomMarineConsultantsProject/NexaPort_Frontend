import { useCallback, useEffect, useState } from "react";
import { getMe } from "../../api/Auth";
import { initialPublicSessionStatus, publicSessionFailureStatus } from "../../utils/publicSessionState";

const currentState = () => ({ status: initialPublicSessionStatus(localStorage.getItem("np_token")), user: null });

export default function useValidatedSession() {
  const [session, setSession] = useState(currentState);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => {
    setSession(currentState());
    setRevision((value) => value + 1);
  }, []);
  const signOut = useCallback(() => {
    localStorage.removeItem("np_token");
    localStorage.removeItem("np_user");
    setSession({ status: "unauthenticated", user: null });
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === "np_token" || event.key === null) retry();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [retry]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("np_token");
    if (!token) {
      Promise.resolve().then(() => { if (active) setSession({ status: "unauthenticated", user: null }); });
      return () => { active = false; };
    }
    Promise.resolve().then(() => { if (active) setSession({ status: "checking", user: null }); });
    getMe({ skipAuthRedirect: true })
      .then(({ data }) => {
        if (!active || localStorage.getItem("np_token") !== token) return;
        if (!data?.id) {
          setSession({ status: "indeterminate", user: null });
          return;
        }
        localStorage.setItem("np_user", JSON.stringify(data));
        setSession({ status: "authenticated", user: data });
      })
      .catch((error) => {
        if (!active || localStorage.getItem("np_token") !== token) return;
        const status = publicSessionFailureStatus(error);
        if (status === "unauthenticated") {
          localStorage.removeItem("np_token");
          localStorage.removeItem("np_user");
          setSession({ status: "unauthenticated", user: null });
        } else {
          setSession({ status, user: null });
        }
      });
    return () => { active = false; };
  }, [revision]);

  return { ...session, retry, signOut };
}
