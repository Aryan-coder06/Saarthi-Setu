import './globals.css';
import Pwa from '../components/Pwa';
export const metadata={title:'Saarthi Setu — Your voice. Your next step.',description:'Discover government entrepreneurship support through a conversation.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'Saarthi Setu'},icons:{icon:[{url:'/icons/icon-512.png',sizes:'1254x1254',type:'image/png'}],apple:'/icons/icon-512.png'}};
export const viewport={width:'device-width',initialScale:1,themeColor:'#f9f8f3'};
export default function RootLayout({children}){return <html lang="en"><body><Pwa/>{children}</body></html>}
