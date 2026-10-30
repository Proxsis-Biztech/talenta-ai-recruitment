import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function PesertaDetailAsesmen() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    navigate(`/peserta/asesmen?id=${id || 'BMRI-DATA-02'}`, { replace: true });
  }, [id, navigate]);

  return null;
}
