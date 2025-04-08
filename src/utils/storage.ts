import AsyncStorage from '@react-native-async-storage/async-storage';
import {CompareFaceDescriptionBody, CreateDescriptionBody} from '../types';

const FACE_DESCRIPTION_KEY = '@face_description';

export const saveFaceDescription = async (data: CreateDescriptionBody) => {
  try {
    // In a real app, you would process the image to get face description
    // For now, we'll just store the image path as the description
    await AsyncStorage.setItem(FACE_DESCRIPTION_KEY, data.image);
    return {face_description: data.image};
  } catch (error) {
    console.error('Error saving face description:', error);
    throw error;
  }
};

export const compareFaceDescription = async (data: CompareFaceDescriptionBody) => {
  try {
    const storedDescription = await AsyncStorage.getItem(FACE_DESCRIPTION_KEY);
    
    if (!storedDescription) {
      return {isMatch: false, similar: 0};
    }

    // In a real app, you would compare the face descriptions
    // For now, we'll just do a simple string comparison
    const isMatch = storedDescription === data.image;
    return {
      isMatch,
      similar: isMatch ? 100 : 0,
    };
  } catch (error) {
    console.error('Error comparing face description:', error);
    throw error;
  }
}; 