// Proxy upload to Cloudinary as a fallback
export const proxyUploadToCloudinary = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/doctor/proxy-upload-to-cloudinary",
      payload
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}; 