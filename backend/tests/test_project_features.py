"""
Backend API tests for Project Creation Features
- POST /api/upload/project-banner - Upload project banner image
- GET /api/uploads/projects/{filename} - Retrieve project banner image
- POST /api/projects - Create project with banner_url required
- GET /api/projects - List projects with business_name and business_logo enriched
- GET /api/projects/business - List projects for a business
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid PNG image bytes (1x1 pixel)
PNG_IMAGE = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'


def authenticate_user(email, user_type="business"):
    """Helper to authenticate a user and return session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Request OTP
    otp_response = session.post(f"{BASE_URL}/api/auth/otp/request", json={"email": email})
    assert otp_response.status_code == 200, f"OTP request failed: {otp_response.text}"
    otp_code = otp_response.json().get("debug_code")
    
    # Verify OTP
    verify_response = session.post(f"{BASE_URL}/api/auth/otp/verify", json={
        "email": email,
        "code": otp_code
    })
    assert verify_response.status_code == 200, f"OTP verify failed: {verify_response.text}"
    
    # Set user type
    session.post(f"{BASE_URL}/api/auth/set-type", json={"user_type": user_type})
    
    return session


def upload_banner(session):
    """Helper to upload a banner and return URL"""
    files = {'file': ('test_banner.png', PNG_IMAGE, 'image/png')}
    response = requests.post(
        f"{BASE_URL}/api/upload/project-banner",
        files=files,
        cookies=session.cookies
    )
    if response.status_code == 200:
        return response.json().get("banner_url")
    return None


class TestProjectBannerUpload:
    """Tests for project banner upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = authenticate_user("test_project_upload@test.com", "business")
        self.session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        yield
    
    def test_upload_project_banner_success(self):
        """Test successful project banner upload"""
        files = {'file': ('test_banner.png', PNG_IMAGE, 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            cookies=self.session.cookies
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "banner_url" in data, "Response should contain banner_url"
        assert data["banner_url"].startswith("/api/uploads/projects/"), f"Invalid banner_url format: {data['banner_url']}"
        print(f"✓ Project banner uploaded successfully: {data['banner_url']}")
    
    def test_upload_project_banner_invalid_type(self):
        """Test upload with invalid file type"""
        files = {'file': ('test.txt', b'not an image', 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload/project-banner",
            files=files,
            cookies=self.session.cookies
        )
        
        assert response.status_code == 400, f"Should reject invalid file type: {response.text}"
        print("✓ Invalid file type correctly rejected")
    
    def test_upload_project_banner_unauthenticated(self):
        """Test upload without authentication"""
        files = {'file': ('test_banner.png', PNG_IMAGE, 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/upload/project-banner", files=files)
        
        assert response.status_code == 401, f"Should require authentication: {response.text}"
        print("✓ Unauthenticated upload correctly rejected")


class TestProjectBannerRetrieval:
    """Tests for project banner retrieval endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and upload a banner"""
        self.session = authenticate_user("test_project_retrieval@test.com", "business")
        self.banner_url = upload_banner(self.session)
        yield
    
    def test_retrieve_project_banner_success(self):
        """Test successful project banner retrieval"""
        if not self.banner_url:
            pytest.skip("Banner upload failed, skipping retrieval test")
        
        filename = self.banner_url.split("/")[-1]
        response = requests.get(f"{BASE_URL}/api/uploads/projects/{filename}")
        
        assert response.status_code == 200, f"Banner retrieval failed: {response.text}"
        assert response.headers.get("content-type", "").startswith("image/"), "Response should be an image"
        print(f"✓ Project banner retrieved successfully: {filename}")
    
    def test_retrieve_nonexistent_banner(self):
        """Test retrieval of non-existent banner"""
        response = requests.get(f"{BASE_URL}/api/uploads/projects/nonexistent_file_12345.png")
        
        assert response.status_code == 404, f"Should return 404 for non-existent file: {response.text}"
        print("✓ Non-existent banner correctly returns 404")


class TestProjectCreation:
    """Tests for project creation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with business user"""
        self.session = authenticate_user("test_project_create@test.com", "business")
        self.session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        self.banner_url = upload_banner(self.session) or "/api/uploads/projects/test.png"
        yield
    
    def test_create_project_success(self):
        """Test successful project creation with all fields"""
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Campagne TikTok Beauté",
            "description": "Recherche créateurs pour campagne beauté",
            "brief": "Brief détaillé pour les créateurs avec instructions spécifiques",
            "budget": 500,
            "content_type": "UGC",
            "target_creators": 3,
            "requirements": ["Minimum 10k abonnés", "Expérience beauté"],
            "deliverables": ["Vidéo verticale (9:16)", "TikTok", "Droits publicitaires"],
            "deadline": "2025-03-01",
            "duration": "2 semaines",
            "location": "Paris",
            "remote_ok": True,
            "banner_url": self.banner_url,
            "incubator_only": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        assert response.status_code == 200, f"Project creation failed: {response.text}"
        data = response.json()
        assert "project_id" in data, "Response should contain project_id"
        assert data.get("message") == "Projet créé", f"Unexpected message: {data.get('message')}"
        print(f"✓ Project created successfully: {data['project_id']}")
    
    def test_create_project_without_banner(self):
        """Test project creation fails without banner_url"""
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project Without Banner",
            "description": "This should fail",
            "budget": 500,
            "content_type": "UGC",
        }
        
        response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        assert response.status_code == 400, f"Should require banner_url: {response.text}"
        print("✓ Project creation without banner correctly rejected")
    
    def test_create_project_without_pack(self):
        """Test project creation fails without pack selection"""
        new_session = authenticate_user("test_no_pack@test.com", "business")
        # Don't select a pack
        
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project Without Pack",
            "description": "This should fail",
            "budget": 500,
            "content_type": "UGC",
            "banner_url": self.banner_url
        }
        
        response = new_session.post(f"{BASE_URL}/api/projects", json=project_data)
        
        assert response.status_code == 400, f"Should require pack selection: {response.text}"
        print("✓ Project creation without pack correctly rejected")


class TestProjectListing:
    """Tests for project listing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and create a test project"""
        self.session = authenticate_user("test_project_list@test.com", "business")
        
        # Update business profile
        self.session.put(f"{BASE_URL}/api/business/me/profile", json={
            "company_name": "TEST_Company",
            "industry": "Tech"
        })
        
        # Select pack
        self.session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        
        # Upload banner and create project
        banner_url = upload_banner(self.session) or "/api/uploads/projects/test.png"
        
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project for Listing",
            "description": "Test project for listing tests",
            "budget": 1000,
            "content_type": "UGC",
            "banner_url": banner_url
        }
        create_response = self.session.post(f"{BASE_URL}/api/projects", json=project_data)
        if create_response.status_code == 200:
            self.project_id = create_response.json().get("project_id")
        
        yield
    
    def test_get_projects_enriched(self):
        """Test GET /api/projects returns enriched data with business_name and business_logo"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        
        assert response.status_code == 200, f"Projects listing failed: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Response should be a list"
        
        # Find our test project
        test_projects = [p for p in projects if p.get("title", "").startswith("TEST_")]
        
        if test_projects:
            project = test_projects[0]
            assert "business_name" in project, "Project should have business_name field"
            assert "business_logo" in project, "Project should have business_logo field"
            assert "banner_url" in project, "Project should have banner_url field"
            print(f"✓ Projects listing returns enriched data: business_name={project.get('business_name')}")
        else:
            print("✓ Projects listing works (no test projects found)")
    
    def test_get_business_projects(self):
        """Test GET /api/projects/business returns only business's projects"""
        response = self.session.get(f"{BASE_URL}/api/projects/business")
        
        assert response.status_code == 200, f"Business projects listing failed: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Response should be a list"
        
        for project in projects:
            assert "project_id" in project, "Each project should have project_id"
            assert "title" in project, "Each project should have title"
            assert "banner_url" in project, "Each project should have banner_url"
        
        print(f"✓ Business projects listing works: {len(projects)} projects found")
    
    def test_get_business_projects_as_creator(self):
        """Test GET /api/projects/business fails for creator users"""
        creator_session = authenticate_user("test_creator_list@test.com", "creator")
        
        response = creator_session.get(f"{BASE_URL}/api/projects/business")
        
        assert response.status_code == 403, f"Should reject creator access: {response.text}"
        print("✓ Business projects endpoint correctly rejects creator access")


class TestProjectApplication:
    """Tests for project application endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup business and creator sessions"""
        # Business session
        self.business_session = authenticate_user("test_biz_apply@test.com", "business")
        self.business_session.post(f"{BASE_URL}/api/business/select-pack", json={"pack_id": "pack_starter"})
        
        # Upload banner and create project
        banner_url = upload_banner(self.business_session) or "/api/uploads/projects/test.png"
        
        project_data = {
            "pack_id": "pack_starter",
            "title": "TEST_Project for Application",
            "description": "Test project",
            "budget": 500,
            "content_type": "UGC",
            "banner_url": banner_url
        }
        create_response = self.business_session.post(f"{BASE_URL}/api/projects", json=project_data)
        self.project_id = create_response.json().get("project_id") if create_response.status_code == 200 else None
        
        # Creator session
        self.creator_session = authenticate_user("test_creator_apply@test.com", "creator")
        
        yield
    
    def test_creator_apply_to_project(self):
        """Test creator can apply to a project"""
        if not self.project_id:
            pytest.skip("Project creation failed")
        
        response = self.creator_session.post(f"{BASE_URL}/api/projects/{self.project_id}/apply")
        
        assert response.status_code == 200, f"Application failed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ Creator successfully applied to project: {data.get('message')}")
    
    def test_creator_cannot_apply_twice(self):
        """Test creator cannot apply to same project twice"""
        if not self.project_id:
            pytest.skip("Project creation failed")
        
        # First application
        self.creator_session.post(f"{BASE_URL}/api/projects/{self.project_id}/apply")
        
        # Second application should fail
        response = self.creator_session.post(f"{BASE_URL}/api/projects/{self.project_id}/apply")
        
        assert response.status_code == 400, f"Should reject duplicate application: {response.text}"
        print("✓ Duplicate application correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
