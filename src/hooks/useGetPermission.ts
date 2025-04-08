import {useEffect, useRef} from 'react';
import {Alert} from 'react-native';
import {Camera} from 'react-native-vision-camera';

interface Config {
  onFinish?: () => Promise<void>;
}

const useGetPermission = ({onFinish}: Config) => {
  const savedOnFinish = useRef<() => Promise<void>>(async () => {});

  savedOnFinish.current = async () => {
    if (onFinish) {
      await onFinish();
    }
  };

  useEffect(() => {
    const getPermissions = async () => {
      await Camera.getCameraPermissionStatus().then(async status => {
        console.log('permission camera: ', status);
        if (status === 'authorized') {
          return;
        }

        const cameraRequest = await Camera.requestCameraPermission();
        if (cameraRequest === 'authorized') {
          Alert.alert('Permission Granted', `Camera permission ${cameraRequest}`);
          return;
        }
      });

      await savedOnFinish.current();
    };

    getPermissions();
  }, []);
};

export default useGetPermission;
