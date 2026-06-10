import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const effectiveDate = "10 June 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">
            Effective Date: {effectiveDate}
          </p>
        </CardHeader>
        <CardContent className="space-y-8 text-sm leading-6 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Who We Are</h2>
            <p>
              Altered Brain Chemistry is operated by Hyperformance Solutions LLC.
              This Privacy Policy explains how Hyperformance Solutions LLC,
              doing business as Altered Brain Chemistry, collects, uses, stores,
              and shares information when you visit this website, create an
              account, purchase products or software licenses, download software,
              request support, or otherwise interact with Altered Brain Chemistry.
            </p>
            <p>
              Hyperformance Solutions LLC also owns and operates Software Licensor,
              a licensing service used to issue, validate, and manage software
              licenses. When you obtain, activate, validate, or manage a software
              license through Altered Brain Chemistry, the Software Licensor privacy
              terms described below also apply to that license-related activity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Contact Information</h2>
            <p>
              For questions, requests, or concerns about this Privacy Policy or
              our data practices, contact us at{" "}
              <a
                href="mailto:privacy@alteredbrainchemistry.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy@alteredbrainchemistry.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
            <p>We may collect the following categories of information:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <span className="font-semibold text-foreground">Account information:</span>{" "}
                name, email address, username, account credentials or federated
                login identifiers, profile information, and account preferences.
              </li>
              <li>
                <span className="font-semibold text-foreground">Google OAuth information:</span>{" "}
                if you sign in using Google OAuth, Google may provide information
                such as your name, email address, profile image, and a Google
                account identifier. We use this information to authenticate you,
                create or maintain your account, and secure access to account-only
                features.
              </li>
              <li>
                <span className="font-semibold text-foreground">Purchase and billing information:</span>{" "}
                order details, purchased products, software license types, billing
                and shipping details, payment status, refund records, tax-related
                information, and fraud-prevention signals. Payment card and bank
                details are processed by our payment providers and are not stored
                directly by us unless a provider returns limited payment metadata
                such as the last four digits, payment method type, transaction ID,
                billing status, or receipt information.
              </li>
              <li>
                <span className="font-semibold text-foreground">Software license information:</span>{" "}
                license codes, product IDs, license types, activation status,
                account identifiers, download eligibility, license history, and
                information needed to issue, validate, renew, support, or prevent
                abuse of software licenses.
              </li>
              <li>
                <span className="font-semibold text-foreground">License activation information:</span>{" "}
                when activating or validating software that uses Software Licensor,
                the licensing service may collect hardware and device-related
                information, including operating system name, CPU details and
                instruction sets, display language, RAM, device identifiers such as
                a MAC address when available or applicable, and the computer name.
                Computer names are collected during license activation and are
                stored separately from anonymized hardware statistics.
              </li>
              <li>
                <span className="font-semibold text-foreground">Downloads and support communications:</span>{" "}
                download requests, support messages, email communications,
                attachments you provide, troubleshooting information, and related
                technical details.
              </li>
              <li>
                <span className="font-semibold text-foreground">Store and browsing information:</span>{" "}
                pages viewed, products viewed, cart contents, download pages
                accessed, approximate location derived from IP address, IP address,
                browser type, device type, operating system, referring pages, and
                log data used for security, fraud prevention, debugging, analytics,
                and site operation.
              </li>
              <li>
                <span className="font-semibold text-foreground">Comments, reviews, and public content:</span>{" "}
                if commenting, reviews, forums, or public posting features are
                enabled, we may collect the content you submit, the information
                shown in the form, your IP address, browser user agent, and
                moderation or spam-detection metadata.
              </li>
              <li>
                <span className="font-semibold text-foreground">Media uploads:</span>{" "}
                if you upload images or other media, those files may contain
                metadata such as EXIF information, including location data if the
                file contains it.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">How We Use Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide, operate, secure, and improve the website and store.</li>
              <li>Create and manage accounts and authenticate users.</li>
              <li>Process orders, payments, refunds, taxes, fraud checks, and receipts.</li>
              <li>Issue, activate, validate, renew, support, and protect software licenses.</li>
              <li>Provide downloads, updates, support, and license recovery.</li>
              <li>Remember cart contents, preferences, and functional site state.</li>
              <li>Respond to questions, bug reports, refund requests, and other support requests.</li>
              <li>Detect abuse, prevent fraud, enforce license limits, and protect our services.</li>
              <li>Comply with legal, tax, accounting, security, and administrative obligations.</li>
              <li>Send service-related messages and, when you choose to receive them, marketing messages.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Legal Bases for Processing</h2>
            <p>
              Where laws such as the GDPR apply, we process personal information
              based on one or more of the following legal bases:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <span className="font-semibold text-foreground">Contractual necessity:</span>{" "}
                to provide accounts, purchases, downloads, software licenses,
                license activation, license validation, support, and related services.
              </li>
              <li>
                <span className="font-semibold text-foreground">Consent:</span>{" "}
                for optional data sharing, optional marketing, or other activities
                where consent is requested.
              </li>
              <li>
                <span className="font-semibold text-foreground">Legitimate interests:</span>{" "}
                to secure our services, prevent fraud and abuse, improve products,
                debug issues, analyze service performance, and protect our business
                and users.
              </li>
              <li>
                <span className="font-semibold text-foreground">Legal obligation:</span>{" "}
                to maintain tax, accounting, payment, security, and compliance records.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Software Licensor</h2>
            <p>
              Software Licensor is owned and operated by Hyperformance Solutions
              LLC. Software Licensor is used by Altered Brain Chemistry to issue,
              validate, activate, manage, and protect software licenses. License
              records may include your name, email address, account identifier,
              product IDs, license codes, license types, activation status,
              transaction or order references, and device-related activation data.
            </p>
            <p>
              During license activation, Software Licensor may collect anonymized
              hardware information such as OS name, CPU details and instruction
              sets, display language, RAM, and potentially a MAC address when
              available or applicable. Software Licensor also collects the computer
              name during activation. Computer names are stored separately from
              anonymized hardware statistics. This information is used to activate
              licenses, enforce license limits, support users, detect abuse, and
              improve compatibility and reliability.
            </p>
            <p>
              Hardware statistics may be shared in anonymized or aggregated form
              for research and development, product planning, compatibility work,
              and performance analysis. We do not sell Software Licensor hardware
              activation data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Google OAuth</h2>
            <p>
              We may use Google OAuth for sign-in and account authentication. When
              you choose to sign in with Google, Google may process information
              according to Google&apos;s own privacy practices. Google&apos;s Privacy
              Policy is available at{" "}
              <a
                href="https://policies.google.com/privacy?hl=en-US"
                className="text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Google Privacy Policy
              </a>
              . Google&apos;s OAuth and API Services policies may also apply to the
              Google sign-in flow and the data requested through it.
            </p>
            <p>
              We only request Google account information needed to authenticate
              you, identify your account, and provide account-related services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Payments, Billing, and Orders</h2>
            <p>
              We may use PayPal and Stripe to process payments, subscriptions,
              invoices, refunds, fraud checks, and related billing activity. When
              you pay through PayPal or Stripe, those providers may collect and
              process payment information under their own privacy policies:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <a
                  href="https://www.paypal.com/us/legalhub/paypal/privacy-full"
                  className="text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  PayPal Privacy Statement
                </a>
              </li>
              <li>
                <a
                  href="https://stripe.com/privacy"
                  className="text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Stripe Privacy Policy
                </a>
              </li>
            </ul>
            <p>
              We may receive limited information from those providers, such as
              payment status, transaction identifiers, billing contact details,
              payment method type, fraud or risk signals, chargeback information,
              and receipt records. We use this information to fulfill orders,
              issue licenses, provide support, process refunds, prevent fraud, and
              maintain required tax and accounting records.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Cookies and Local Storage</h2>
            <p>
              We may use cookies, local storage, session storage, and similar
              technologies for account authentication, security, cart contents,
              checkout, preferences, downloads, analytics, and functional caching.
              Some cookies or storage items are necessary for the website, store,
              sign-in, checkout, or licensing features to work.
            </p>
            <p>
              If comments, reviews, or login features are enabled, cookies may be
              used to remember information you choose to save, maintain logged-in
              sessions, or support moderation and spam prevention. You can control
              cookies through your browser settings, but disabling some cookies may
              prevent parts of the website, checkout, account features, or license
              management from working properly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Third-Party Services and Sharing</h2>
            <p>
              We do not sell personal information. We may share information with
              service providers and third parties that help us operate the website,
              store, licensing service, payments, security, analytics, email,
              support, hosting, fulfillment, and fraud-prevention systems. These
              may include:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Google, for OAuth sign-in and related account authentication.</li>
              <li>PayPal and Stripe, for payment processing and billing.</li>
              <li>Software Licensor, for software license issuance, activation, validation, and support.</li>
              <li>Hosting, database, storage, authentication, security, email, and analytics providers.</li>
              <li>Fulfillment or shipping providers if physical products are offered.</li>
              <li>Spam detection, fraud prevention, moderation, and abuse-prevention services.</li>
              <li>Authorities or other parties when required by law or necessary to protect rights, safety, security, or service integrity.</li>
            </ul>
            <p>
              Articles or pages may include embedded content from other websites,
              such as videos, images, widgets, or external articles. Embedded
              content from other websites may behave as if you visited that other
              website directly, and those websites may collect data, use cookies,
              embed tracking, and monitor your interaction with the content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Data Retention</h2>
            <p>
              We retain information for as long as reasonably needed for the
              purposes described in this Privacy Policy, including providing
              accounts, downloads, support, purchases, and license services;
              maintaining tax, accounting, payment, fraud-prevention, and security
              records; resolving disputes; enforcing agreements; and complying
              with legal obligations.
            </p>
            <p>
              Software license data may be retained indefinitely when continued
              retention is necessary to provide ongoing license validation,
              license recovery, update eligibility, support, fraud prevention, and
              abuse prevention. Comments, reviews, and related metadata may also be
              retained indefinitely unless removed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Data Security</h2>
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect information. Data may be transmitted
              over HTTPS and stored using access controls and encryption where
              appropriate. No method of transmission or storage is perfectly secure,
              but we work to protect information against unauthorized access,
              disclosure, alteration, and destruction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Your Rights and Choices</h2>
            <p>
              Depending on where you live, you may have rights to access, correct,
              export, object to, restrict, or request deletion of personal
              information. You may also be able to withdraw consent where processing
              is based on consent. To make a request, contact us at{" "}
              <a
                href="mailto:privacy@alteredbrainchemistry.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy@alteredbrainchemistry.com
              </a>
              .
            </p>
            <p>
              Some information may need to be retained for licensing, security,
              fraud prevention, tax, accounting, legal, or administrative reasons.
              Deleting certain account or license data may affect your ability to
              access downloads, recover licenses, validate software, or receive
              support.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Children&apos;s Privacy</h2>
            <p>
              Our website, store, and software licensing services are not intended
              for children under 13, and we do not knowingly collect personal
              information from children under 13.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">International Visitors</h2>
            <p>
              If you access our services from outside the United States, your
              information may be processed in the United States or other locations
              where our service providers operate. By using the website, store, or
              licensing services, you understand that information may be transferred
              to and processed in those locations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be
              posted on this page with an updated effective date.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
