import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FaTrash, FaEdit } from 'react-icons/fa';

interface HistoryProps {
    setContentImages: (images: any) => void;
}

function History(props: HistoryProps, ref: any) {
    const [imageHistory, setImageHistory] = useState<string[]>([]);

    useImperativeHandle(ref, () => ({ addImagesToHistory }));

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('imageHistory');
            if (storedHistory) {
                setImageHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load image history from localStorage", error);
        }
    }, []);


    const addImagesToHistory = useCallback((newImages: string[]) => {        
        setImageHistory(prevHistory => {
            const updatedHistory = [...new Set([...newImages, ...prevHistory])].slice(0, 50);
            try {
                localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
            } catch (error) {
                console.error("Failed to save image history to localStorage", error);
            }
            return updatedHistory;
        });
    }, []);

    const handleDeleteFromHistory = useCallback((imageUrl: string) => {
        setImageHistory(prevHistory => {
            const updatedHistory = prevHistory.filter(img => img !== imageUrl);
            try {
                localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
            } catch (error) {
                console.error("Failed to update image history in localStorage", error);
            }
            return updatedHistory;
        });

        const formData = new FormData();
        const key = imageUrl.split('/').pop() || '';
        formData.append('key', key);
        fetch('/api/cos-upload', { method: 'DELETE', body: formData });
    }, []);

    return (
        imageHistory.length > 0 && (
            <div className="p-6 md:p-0 md:mt-6">
                <h3 className="flex items-center justify-between text-lg font-semibold text-gray-800 mb-4">
                    我的作品<a href="https://www.iodraw.com/tool/image-editor" target="_blank" className="text-xs text-blue-500 hover:underline">在线编辑</a>
                </h3>
                {imageHistory.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {imageHistory.map((image, index) => (
                            <div key={index} className="relative group">
                                <img src={image} alt={`历史图片 ${index + 1}`} className="w-full max-h-40 object-cover rounded-md cursor-pointer shadow-md" />
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity rounded-md">
                                    <button onClick={() => { handleDeleteFromHistory(image); }} className="text-white p-2">
                                        <FaTrash size={20} />
                                    </button>

                                    <button onClick={() => { props.setContentImages((prev: any) => [...prev, image]); }} className="text-white p-2">
                                        <FaEdit size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">暂无历史记录。</p>
                )}
            </div>
        )
    );
}

export default forwardRef(History);