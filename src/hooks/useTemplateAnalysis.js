import { useCallback, useRef, useState } from "react";
import { analyseTemplateSource } from "../api/templateApi";

const initial = { phase: "idle", result: null, error: "" };

export default function useTemplateAnalysis() {
  const [state, setState] = useState(initial);
  const controllerRef = useRef(null);
  const inFlightRef = useRef(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = null;
    setState((current) => ({ ...current, phase: "idle", error: "Analysis cancelled." }));
  }, []);

  const analyse = useCallback(async (file, sourceType) => {
    if (inFlightRef.current) return inFlightRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ ...initial, phase: "field_mapping" });
    const request = analyseTemplateSource(file, sourceType, controller.signal)
      .then((response) => {
        setState({ phase: "review", result: response.data, error: "" });
        return response.data;
      })
      .catch((error) => {
        setState({ phase: "idle", result: null, error: error.response?.data?.message || error.message });
        throw error;
      })
      .finally(() => { controllerRef.current = null; inFlightRef.current = null; });
    inFlightRef.current = request;
    return request;
  }, []);

  return { ...state, analyse, cancel };
}
