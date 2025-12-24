import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h2>❌ Une erreur est survenue. Veuillez réessayer plus tard.</h2>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
