"use client"
import {useCallback, useState, useMemo} from "react";
import styles from './page.module.css'
import { AppContextProvider } from '@/components/context-provider/app-context-provider';
import dynamic from "next/dynamic";

const Recyclai = dynamic(
    () => import('@/examples/livestream-example/recyclai'),
    {
        loading: () => <p>Loading...</p>,

        ssr: false,
    }
);


export default function Home() {

  return (
      <div className={styles.App}>
        <AppContextProvider>
          <>
            <Recyclai />
          </>
        </AppContextProvider>
      </div>
  )
}


