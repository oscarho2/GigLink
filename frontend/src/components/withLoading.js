import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Box } from '@mui/material';

/**
 * Higher-order component that adds loading functionality to any component
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {Object} loadingConfig - Configuration for loading behavior
 * @returns {React.Component} - Enhanced component with loading capabilities
 */
const withLoading = (WrappedComponent, loadingConfig = {}) => {
  const {
    loadingType = 'spinner',
    loadingSize = 'medium',
    loadingText = 'Loading...',
    fullScreen = false,
    minLoadingTime = 300, // Minimum time to show loading (prevents flashing)
    skeletonRows = 3,
    skeletonVariant = 'rectangular'
  } = loadingConfig;

  return React.forwardRef((props, ref) => {
    const { isLoading, loadingProps = {}, ...restProps } = props;
    const [showLoading, setShowLoading] = React.useState(false);
    const loadingStartTime = React.useRef(null);

    React.useEffect(() => {
      if (isLoading) {
        loadingStartTime.current = Date.now();
        setShowLoading(true);
      } else if (showLoading) {
        const elapsed = Date.now() - (loadingStartTime.current || 0);
        const remainingTime = Math.max(0, minLoadingTime - elapsed);
        
        setTimeout(() => {
          setShowLoading(false);
        }, remainingTime);
      }
    }, [isLoading, showLoading, minLoadingTime]);

    if (showLoading) {
      return (
        <LoadingSpinner
          type={loadingProps.type || loadingType}
          size={loadingProps.size || loadingSize}
          text={loadingProps.text || loadingText}
          fullScreen={loadingProps.fullScreen || fullScreen}
          rows={loadingProps.rows || skeletonRows}
          variant={loadingProps.variant || skeletonVariant}
        />
      );
    }

    return <WrappedComponent ref={ref} {...restProps} />;
  });
};

export default withLoading;