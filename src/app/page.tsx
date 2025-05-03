import VideoView from '../components/VideoView';
import Sidebar from '../components/Sidebar';

export default function Home() {
  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="flex-1">
        <VideoView />
      </div>
      <div className="w-full md:w-[350px] mt-4 md:mt-0 bg-gray-100 h-full overflow-auto">
        <Sidebar />
      </div>
    </div>
  );
}