import { Component } from "react";
import PropTypes from "prop-types";

/**
 * ErrorBoundary catches uncaught rendering errors in its child tree
 * and displays a graceful fallback UI instead of crashing the application.
 *
 * @extends {Component}
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-10 text-center"
        >
          <p className="text-lg font-semibold text-gray-800 mb-2">
            Something went wrong
          </p>
          <p className="text-sm text-gray-500 mb-4">
            An unexpected error occurred. Please refresh the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            aria-label="Retry loading the content"
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
