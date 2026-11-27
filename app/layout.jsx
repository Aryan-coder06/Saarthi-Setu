import './globals.css';
import Pwa from '../components/Pwa';
export const metadata={title:'Saarthi Setu — Your voice. Your next step.',description:'Discover government entrepreneurship support through a conversation.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'Saarthi Setu'},icons:{icon:'/icons/icon-192.png',apple:'/icons/icon-192.png'}};
export const viewport={width:'device-width',initialScale:1,themeColor:'#f5f4ee'};
export default function RootLayout({children}){return <html lang="en"><body><Pwa/>{children}</body></html>}
