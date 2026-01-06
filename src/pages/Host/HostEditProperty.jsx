import React from "react";
import { useParams } from "react-router-dom";
import HostAddProperty from "./HostAddProperty";

export default function HostEditProperty() {
  const { id } = useParams();
  return <HostAddProperty editId={id} />;
}
