import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <article className="card text-gray-700 leading-relaxed">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: September 7, 2026</p>

        <p className="mb-6">
          MeProofIt (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is an educational spelling and punctuation
          practice game. This Privacy Policy explains what information we collect, how we use it,
          and the choices you have. It applies to meproofit.com and related services.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Contact</h2>
        <p className="mb-6">
          Questions about this policy or your data:{' '}
          <a className="text-primary-600 hover:underline" href="mailto:support@meproofit.com">
            support@meproofit.com
          </a>
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Information we collect</h2>
        <p className="mb-3">Depending on how you use MeProofIt, we may collect:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>
            <strong>Account information from Google Sign-In.</strong> If you choose &quot;Sign in
            with Google,&quot; Google shares your name, email address, and profile photo with us.
            We use this to create and recognize your MeProofIt account.
          </li>
          <li>
            <strong>Profile information you provide.</strong> Display name and grade level, which
            we use to show the right difficulty of practice sentences.
          </li>
          <li>
            <strong>Gameplay information.</strong> Practice sentences, scores, number of attempts,
            and daily-challenge results so you can continue a session and see past work.
          </li>
          <li>
            <strong>Technical information.</strong> Basic logs needed to run the site (for example,
            to prevent abuse of sentence generation). For signed-in users this may include a user
            ID. For guests it may include a truncated network address used only for short-term rate
            limiting.
          </li>
        </ul>
        <p className="mb-6">
          Guest play (without Google) stores name and grade in your browser only. We do not require
          Google Sign-In to try the game.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">How we use information</h2>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Operate the game, including generating practice sentences for the chosen grade</li>
          <li>Sign you in, keep you signed in, and remember your grade and name</li>
          <li>Save daily-challenge results and related game progress</li>
          <li>Protect the service (rate limits, security, and fixing bugs)</li>
          <li>Respond to support requests</li>
        </ul>
        <p className="mb-6">
          We do not sell personal information. We do not use Google user data for advertising.
          We do not use the content of a student&apos;s corrections to train advertising models.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Children</h2>
        <p className="mb-6">
          MeProofIt is designed for students practicing writing skills, often with a parent,
          teacher, or school. If a child uses Google Sign-In, that sign-in is provided by Google
          under Google&apos;s terms. We only use the Google account information we receive (name,
          email, profile photo) to run the MeProofIt account. We do not ask children for a home
          address, phone number, or other sensitive personal details. If you believe we have
          information about a child that should be removed, email{' '}
          <a className="text-primary-600 hover:underline" href="mailto:support@meproofit.com">
            support@meproofit.com
          </a>{' '}
          and we will review the request.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">How we share information</h2>
        <p className="mb-3">We share information only with services that help us run MeProofIt:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>
            <strong>Google.</strong> Authentication when you choose Sign in with Google.
          </li>
          <li>
            <strong>Supabase.</strong> Account, profile, and stored game data for signed-in users.
          </li>
          <li>
            <strong>Vercel.</strong> Hosting the website and API.
          </li>
          <li>
            <strong>OpenAI.</strong> Our server sends the practice topic, grade, and difficulty so
            a new sentence can be generated. We do not send your Google email or password to
            OpenAI. Student answer text is not sent to OpenAI to generate sentences.
          </li>
        </ul>
        <p className="mb-6">
          We may also disclose information if required by law, or to protect the security of
          MeProofIt and its users.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Cookies and local storage</h2>
        <p className="mb-6">
          We use browser storage (including local storage) to remember your session, grade, and
          recent game results, and to keep the game working if you are not signed in. Signing out
          clears MeProofIt account data stored in your browser. You can also clear site data in
          your browser settings.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Data retention</h2>
        <p className="mb-6">
          We keep account and gameplay records while your account is active and as needed to
          operate the daily challenge and support the service. You may request deletion of your
          MeProofIt account data by emailing{' '}
          <a className="text-primary-600 hover:underline" href="mailto:support@meproofit.com">
            support@meproofit.com
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Your choices</h2>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Play as a guest without using Google</li>
          <li>Sign out at any time</li>
          <li>Update your name or grade in Settings</li>
          <li>Request access or deletion of your MeProofIt data using the contact email above</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Security</h2>
        <p className="mb-6">
          We use HTTPS, keep the OpenAI API key on the server, and limit what is stored in the
          browser for signed-in users. No method of transmission or storage is 100% secure.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Changes</h2>
        <p className="mb-6">
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date
          at the top will change when we do. Continued use of MeProofIt after an update means you
          accept the revised policy.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Google API user data</h2>
        <p className="mb-0">
          MeProofIt&apos;s use of information received from Google APIs adheres to the{' '}
          <a
            className="text-primary-600 hover:underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We use Google user data only to authenticate
          you and to display your name and photo in the app.
        </p>
      </article>
    </div>
  );
};
