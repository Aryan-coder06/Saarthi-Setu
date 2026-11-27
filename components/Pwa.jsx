'use client';
import React from 'react';
export default class Pwa extends React.Component{componentDidMount(){if(process.env.NODE_ENV==='production'&&'serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});}render(){return null}}
