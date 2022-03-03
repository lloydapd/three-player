import React from 'react'
import { useLoader } from '@react-three/fiber'
import colorMap from '../textures/map.jpeg'
import * as THREE from 'three'

export default function Cube() {
  const texture = new THREE.TextureLoader().load( colorMap );
  const textureMap = useLoader(texture, colorMap)

  return (
    <mesh rotation={[ 90, 0, 30 ]}>
      <boxBufferGeometry attach="geometry" args={[ 3, 3, 3 ]} />
      <meshLambertMaterial attach="material" color="green" />
    </mesh>
  )
}
