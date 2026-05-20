export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const message = requestUrl.searchParams.get("text") ?? "";
  const whatsappUrl = new URL("https://api.whatsapp.com/send");

  whatsappUrl.searchParams.set("text", message);

  return Response.redirect(whatsappUrl, 302);
}
