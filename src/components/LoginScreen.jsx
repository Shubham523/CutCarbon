import PropTypes from "prop-types";

/**
 * LoginScreen component displaying the landing page and Sign-in action.
 *
 * @param {Object} props - The component props.
 * @param {Function} props.onLogin - Callback triggered when login is clicked.
 */
export default function LoginScreen({ onLogin }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">CutCarbon</h1>
      <p className="text-gray-600 mb-8">Track your footprint effortlessly.</p>
      <button
        onClick={onLogin}
        aria-label="Sign in with Google"
        className="w-full max-w-sm bg-gray-900 text-white py-4 rounded-full font-bold text-lg"
      >
        Sign in with Google
      </button>
    </div>
  );
}

LoginScreen.propTypes = {
  onLogin: PropTypes.func.isRequired,
};
