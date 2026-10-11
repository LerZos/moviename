const SERVER_ONLY_STUB = "data:text/javascript,export%20{}";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: SERVER_ONLY_STUB, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
