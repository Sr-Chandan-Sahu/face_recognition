import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import React, {useCallback, useState} from 'react';
import Layout from '../components/Layout';
import {ImageObj} from '../types';
import {useDisclosure} from '../hooks';
import ModalCameraAuto from '../components/ModalCameraAuto';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  compareFaceDescription,
  saveFaceDescription,
} from '../utils/storage';

const defaultAva =
  'https://media.gettyimages.com/id/1227618801/vector/human-face-avatar-icon-profile-for-social-network-man-vector-illustration.jpg?s=2048x2048&w=gi&k=20&c=a8O0jXGeYVFI9TCguB1f-7sFDsinMVJnoEpbEg4yhvY=';

const Home = () => {
  const {isOpen, onOpen, onClose} = useDisclosure();
  const [registeredImg, setRegisteredImg] = useState('');
  const [loadingRegister, setLoadingRegister] = useState(false);

  const [currentImg, setCurrentImg] = useState<ImageObj | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [similarity, setSimilarity] = useState('');

  const matchFaces = useCallback(
    async (imgPost: string) => {
      if (!registeredImg || !imgPost) {
        return;
      }
      setLoadingMatch(true);

      try {
        const response = await compareFaceDescription({
          face_description: registeredImg,
          image: imgPost,
        });

        console.log('res: ', response);

        if (response.isMatch) {
          setSimilarity(`${response.similar}%`);
          setLoadingMatch(false);
          return;
        }

        setSimilarity('Not Match');
        setLoadingMatch(false);
      } catch (error) {
        console.log('error match: ', error);
        setSimilarity('Error');
        setLoadingMatch(false);
      }
    },
    [registeredImg],
  );

  const handleRegisFace = useCallback(async (val: ImageObj) => {
    setLoadingRegister(true);
    try {
      const imgBase64 = await ReactNativeBlobUtil.fs.readFile(
        val.uri,
        'base64',
      );

      const foundFace = await saveFaceDescription({image: imgBase64});
      setRegisteredImg(foundFace.face_description);
      setLoadingRegister(false);
    } catch (error) {
      console.log('error regis: ', error);
      setLoadingRegister(false);
    }
  }, []);

  const handleSetImage = useCallback(
    async (val: ImageObj) => {
      if (registeredImg) {
        setCurrentImg(val);
        const imgBase64 = await ReactNativeBlobUtil.fs.readFile(
          val.uri,
          'base64',
        );
        await matchFaces(imgBase64);
        return;
      }

      await handleRegisFace(val);
    },
    [registeredImg, handleRegisFace, matchFaces],
  );

  const clearResults = useCallback((isLogout?: boolean) => {
    if (isLogout) {
      setRegisteredImg('');
    }
    setCurrentImg(null);
    setSimilarity('');
  }, []);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Layout style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Face Recognition</Text>
        </View>
        
        <ModalCameraAuto
          visible={isOpen}
          onClose={onClose}
          onFinish={handleSetImage}
        />
        
        {!registeredImg ? (
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              You're not registered{' '}
              {loadingRegister && <ActivityIndicator color="#4A90E2" size="small" />}
            </Text>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={onOpen}
              disabled={loadingRegister}
            >
              <Text style={styles.registerButtonText}>Register Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileContainer}>
            <TouchableOpacity 
              style={styles.imageContainer}
              onPress={onOpen}
              activeOpacity={0.8}
            >
              <Image
                style={styles.profileImage}
                source={{uri: currentImg ? currentImg.uri : defaultAva}}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.tapText}>Tap to scan</Text>
              </View>
            </TouchableOpacity>
            
            {!similarity ? (
              <Text style={styles.registeredText}>You're Registered. Tap the photo to recognize</Text>
            ) : (
              <View style={styles.resultContainer}>
                <Text
                  style={[
                    styles.resultText,
                    {color: similarity.includes('%') ? '#00c851' : '#ff4444'},
                  ]}>
                  {similarity}
                </Text>
              </View>
            )}
            
            {loadingMatch ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  Recognizing <ActivityIndicator size="small" color="#4A90E2" />
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.clearButton]}
                    onPress={() => clearResults()}
                  >
                    <Text style={styles.actionButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.logoutButton]}
                    onPress={() => clearResults(true)}
                  >
                    <Text style={styles.actionButtonText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.clearStorageButton}
          onPress={() => {
            clearResults(true);
            Alert.alert('Success', 'Storage cleared');
          }}
        >
          <Text style={styles.clearStorageText}>Clear Storage</Text>
        </TouchableOpacity>
      </Layout>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    width: '100%',
    paddingVertical: 15,
    marginBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
  },
  registerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 350,
  },
  registerText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555555',
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 350,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    height: 180,
    width: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    alignItems: 'center',
  },
  tapText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  registeredText: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6c757d',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearStorageButton: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clearStorageText: {
    color: '#6c757d',
    fontSize: 14,
  },
});
