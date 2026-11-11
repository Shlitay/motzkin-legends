import { redirect } from "next/navigation";

// No 404 page: any unknown link goes to the predictions page. Signed-out
// visitors are sent on from there to the login page by the proxy.
export default function NotFound() {
  redirect("/predictions");
}
