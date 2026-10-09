import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authLinkClass } from "@/components/auth/styles";

/** An address with no school behind it, like typo.brillianda.com. */
export default function NoSuchSchool() {
  return (
    <AuthLayout
      title="There’s no school at this address"
      description={
        <>
          <p>Check the address for a typo. School addresses look like greenfield.brillianda.com.</p>
          <p>If you know your email, we can send you a link to your school.</p>
        </>
      }
      footer={
        <>
          <Link href="/login" className={authLinkClass}>
            Find your school
          </Link>{" "}
          or{" "}
          <Link href="/signup" className={authLinkClass}>
            create one
          </Link>
        </>
      }
    />
  );
}
